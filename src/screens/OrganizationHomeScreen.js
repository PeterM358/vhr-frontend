import React, { useCallback, useContext, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { FAB, Text, useTheme } from 'react-native-paper';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect, useNavigation } from '@react-navigation/native';

import { AuthContext } from '../context/AuthManager';
import ScreenBackground from '../components/ScreenBackground';
import OrgAppHeader from '../components/org/OrgAppHeader';
import DashboardHeroCard from '../components/dashboard/DashboardHeroCard';
import DashboardSummaryRow from '../components/dashboard/DashboardSummaryRow';
import DashboardActionGrid from '../components/dashboard/DashboardActionGrid';
import DashboardCard from '../components/dashboard/DashboardCard';
import { STORAGE_KEYS } from '../constants/storageKeys';
import { COLORS } from '../constants/colors';
import { listOrgFleet } from '../api/fleet';
import {
  buildOrgNavItems,
  isFleetFocusedOrg,
  organizationMembershipFor,
  readOrganizationMemberships,
  resolveActiveOrganizationId,
  setCurrentOrganizationId,
} from '../utils/orgWorkspace';
import { useScrollContentBottomPadding } from '../utils/mobileWebInsets';
import { useTranslation } from '../i18n';
import {
  navigateToNotifications,
  navigateToOrgCalendar,
  navigateToOrgFleet,
  navigateToOrgNetwork,
  navigateToOrgWorkforce,
  navigateToPartnerDashboard,
  navigateToProfile,
} from '../navigation/webNavigation';

const PRIMARY_HOME_ROUTES = new Set(['OrgOverview', 'OrgFleet']);

export default function OrganizationHomeScreen() {
  const navigation = useNavigation();
  const theme = useTheme();
  const { t } = useTranslation();
  const { authToken } = useContext(AuthContext);
  const [org, setOrg] = useState(null);
  const [memberships, setMemberships] = useState([]);
  const [fleetCount, setFleetCount] = useState(null);
  const [loading, setLoading] = useState(true);
  const scrollBottomPadding = useScrollContentBottomPadding(80);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const rows = await readOrganizationMemberships();
      setMemberships(rows);
      const orgId = await AsyncStorage.getItem(STORAGE_KEYS.CURRENT_ORGANIZATION_ID);
      const active = organizationMembershipFor(rows, orgId) || rows[0] || null;
      setOrg(active);
      if (!active?.id) {
        setFleetCount(0);
        return;
      }
      try {
        const token = authToken || (await AsyncStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN));
        const resolved = await resolveActiveOrganizationId(active.id);
        const data = await listOrgFleet(token, resolved, {});
        const list = Array.isArray(data?.results) ? data.results : Array.isArray(data) ? data : [];
        setFleetCount(list.length);
      } catch {
        setFleetCount(null);
      }
    } finally {
      setLoading(false);
    }
  }, [authToken]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const fleetFocused = isFleetFocusedOrg(org);
  const navItems = buildOrgNavItems(org, t);
  const hasFleet = fleetCount == null ? true : fleetCount > 0;
  const orgName = org?.display_name || t('org.home.title', null, 'Organization');

  const openSection = (route) => {
    if (route === 'OrgFleet') {
      navigateToOrgFleet(navigation, { orgId: org?.id });
      return;
    }
    if (route === 'OrgNetwork') {
      navigateToOrgNetwork(navigation, { orgId: org?.id });
      return;
    }
    if (route === 'OrgWorkforce') {
      navigateToOrgWorkforce(navigation, { orgId: org?.id });
      return;
    }
    if (route === 'OrgOverview') {
      return;
    }
    navigation.navigate(route, { organizationId: org?.id });
  };

  const switchOrganization = async (nextOrg) => {
    await setCurrentOrganizationId(nextOrg.id);
    setOrg(nextOrg);
    load();
  };

  const goImportFleet = () => {
    navigation.navigate('FleetRegisterImport', { organizationId: org?.id });
  };

  const goRequestRepair = () => {
    if (!hasFleet) {
      Alert.alert(
        t('org.home.needVehicleTitle', null, 'Add vehicles first'),
        t(
          'org.home.needVehicleBody',
          null,
          'Import your fleet register (or add vehicles), then request a repair the same way customers do.',
        ),
        [
          { text: t('common.cancel', null, 'Cancel'), style: 'cancel' },
          ...(org?.manage_fleet
            ? [{ text: t('fleetImport.openAction', null, 'Import fleet'), onPress: goImportFleet }]
            : []),
          {
            text: t('fleet.openFleet', null, 'View fleet'),
            onPress: () => navigateToOrgFleet(navigation, { orgId: org?.id }),
          },
        ],
      );
      return;
    }
    navigation.navigate('CreateRepair', {
      mode: 'request',
      organizationId: org?.id,
      returnTo: 'OrgHome',
      origin: 'OrgHome',
    });
  };

  const summaryItems = useMemo(
    () => [
      {
        key: 'fleet',
        value: fleetCount == null ? '—' : fleetCount,
        label: t('org.home.summary.fleet', null, 'Fleet'),
        onPress: () => navigateToOrgFleet(navigation, { orgId: org?.id }),
      },
      {
        key: 'repair',
        value: hasFleet ? t('org.home.summary.ready', null, 'Ready') : t('org.home.summary.needVehicles', null, 'Add cars'),
        label: t('org.home.summary.repair', null, 'Repair'),
        onPress: goRequestRepair,
      },
    ],
    [fleetCount, hasFleet, navigation, org?.id, t],
  );

  const actionTiles = useMemo(() => {
    const tiles = [
      {
        key: 'fleet',
        icon: 'truck',
        title: t('fleet.openFleet', null, 'View fleet'),
        subtitle: t(
          'org.home.actions.fleetSubtitle',
          null,
          'Browse company vehicles, readiness, and details.',
        ),
        onPress: () => navigateToOrgFleet(navigation, { orgId: org?.id }),
        count: typeof fleetCount === 'number' ? fleetCount : undefined,
      },
      {
        key: 'calendar',
        icon: 'calendar-month-outline',
        title: t('org.home.actions.calendar', null, 'Calendar'),
        subtitle: t(
          'org.home.actions.calendarSubtitle',
          null,
          'Fleet readiness deadlines and reminders.',
        ),
        onPress: () => navigateToOrgCalendar(navigation, { orgId: org?.id }),
      },
      {
        key: 'notifications',
        icon: 'bell-outline',
        title: t('org.home.actions.notifications', null, 'Notifications'),
        subtitle: t(
          'org.home.actions.notificationsSubtitle',
          null,
          'Open your notification inbox.',
        ),
        onPress: () =>
          navigateToNotifications(navigation, {
            returnTo: 'OrgHome',
            backLabelKey: 'org.home.title',
          }),
      },
      {
        key: 'profile',
        icon: 'account-circle-outline',
        title: t('org.home.actions.profile', null, 'Profile'),
        subtitle: t(
          'org.home.actions.profileSubtitle',
          null,
          'Open your account profile.',
        ),
        onPress: () => navigateToProfile(navigation),
      },
    ];

    if (org?.manage_fleet) {
      tiles.push({
        key: 'import',
        icon: 'file-upload-outline',
        title: t('fleetImport.openAction', null, 'Import fleet'),
        subtitle: t(
          'org.home.actions.importSubtitle',
          null,
          'Upload your register spreadsheet to add vehicles.',
        ),
        onPress: goImportFleet,
      });
    }

    if (org?.manage_fleet || org?.can_view_fleet || fleetFocused) {
      tiles.push({
        key: 'repair',
        icon: 'wrench',
        title: t('org.home.requestRepair', null, 'Request repair'),
        subtitle: hasFleet
          ? t(
              'org.home.actions.repairSubtitle',
              null,
              'Request service for a fleet vehicle like a customer.',
            )
          : t(
              'org.home.needVehicleHint',
              null,
              'Request repair needs at least one fleet vehicle — import your register first.',
            ),
        onPress: goRequestRepair,
      });
    }

    navItems
      .filter((item) => item.route && !PRIMARY_HOME_ROUTES.has(item.route))
      .forEach((item) => {
        const iconByRoute = {
          OrgWorkforce: 'account-hard-hat',
          OrgWarehouse: 'warehouse',
          OrgDocuments: 'file-document-outline',
          OrgConstruction: 'hard-hat',
          OrgTransport: 'bus',
          OrgWorkOrders: 'clipboard-list-outline',
          OrgNetwork: 'transit-connection-variant',
          OrgInvoicing: 'receipt',
          OrgLedger: 'book-open-outline',
          OrgLocations: 'map-marker-radius',
          OrgPublicProfile: 'earth',
        };
        tiles.push({
          key: item.key || item.route,
          icon: iconByRoute[item.route] || 'view-grid-outline',
          title: item.label,
          subtitle: t('org.home.actions.openSection', null, 'Open this workspace section.'),
          onPress: () => openSection(item.route),
        });
      });

    if (org?.has_shop_locations) {
      tiles.push({
        key: 'shop',
        icon: 'storefront-outline',
        title: t('org.home.openServiceCenter', null, 'Open service center workspace'),
        subtitle: t(
          'org.home.actions.shopSubtitle',
          null,
          'Switch to bay operations, offers, and shop tools.',
        ),
        onPress: () => navigateToPartnerDashboard(navigation),
      });
    }

    return tiles;
  }, [
    fleetCount,
    fleetFocused,
    hasFleet,
    navItems,
    navigation,
    org?.can_view_fleet,
    org?.has_shop_locations,
    org?.id,
    org?.manage_fleet,
    t,
  ]);

  const fabConfig = hasFleet
    ? { label: t('org.home.requestRepair', null, 'Request repair'), onPress: goRequestRepair }
    : org?.manage_fleet
      ? { label: t('fleetImport.openAction', null, 'Import fleet'), onPress: goImportFleet }
      : { label: t('fleet.openFleet', null, 'View fleet'), onPress: () => navigateToOrgFleet(navigation, { orgId: org?.id }) };

  return (
    <ScreenBackground safeArea={false}>
      <OrgAppHeader
        mode="dashboard"
        title={orgName}
      />
      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingBottom: scrollBottomPadding }]}
        keyboardShouldPersistTaps="handled"
      >
        <DashboardHeroCard
          title={t('org.home.greeting', { name: orgName }, `Welcome, ${orgName}`)}
          subtitle={
            fleetFocused
              ? t(
                  'org.home.fleetSubtitle',
                  null,
                  'Manage your company fleet and request repairs the same way customers do.',
                )
              : t(
                  'org.home.subtitle',
                  null,
                  'Shared workforce, fleet, documents, and operations for your company.',
                )
          }
        />

        {memberships.length > 1 ? (
          <DashboardCard style={styles.switcherCard}>
            <Text style={styles.switcherLabel}>{t('org.switcher.label', null, 'Organization')}</Text>
            <View style={styles.switcherList}>
              {memberships.map((row) => {
                const active = row.id === org?.id;
                return (
                  <Pressable
                    key={row.id}
                    onPress={() => switchOrganization(row)}
                    style={({ pressed }) => [
                      styles.switcherChip,
                      active && styles.switcherChipActive,
                      pressed && styles.switcherChipPressed,
                    ]}
                    accessibilityRole="button"
                  >
                    <Text style={[styles.switcherChipText, active && styles.switcherChipTextActive]} numberOfLines={1}>
                      {row.display_name}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </DashboardCard>
        ) : null}

        {loading ? (
          <ActivityIndicator color="#fff" style={styles.loader} />
        ) : (
          <>
            <DashboardSummaryRow items={summaryItems} />
            <DashboardActionGrid tiles={actionTiles} />
          </>
        )}
      </ScrollView>

      <FAB
        label={fabConfig.label}
        style={[styles.fab, { backgroundColor: theme.colors.primary }]}
        color="#fff"
        onPress={fabConfig.onPress}
      />
    </ScreenBackground>
  );
}

const styles = StyleSheet.create({
  scroll: {
    paddingHorizontal: 14,
    paddingTop: 12,
  },
  loader: {
    marginVertical: 24,
  },
  switcherCard: {
    marginBottom: 12,
    paddingVertical: 14,
    paddingHorizontal: 14,
  },
  switcherLabel: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 10,
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  switcherList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  switcherChip: {
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1,
    borderColor: COLORS.BORDER_SOFT,
    maxWidth: '100%',
  },
  switcherChipActive: {
    backgroundColor: COLORS.PRIMARY_GLASS,
    borderColor: COLORS.ACCENT,
  },
  switcherChipPressed: {
    opacity: 0.88,
  },
  switcherChipText: {
    color: 'rgba(255,255,255,0.82)',
    fontSize: 13,
    fontWeight: '600',
  },
  switcherChipTextActive: {
    color: '#fff',
  },
  fab: {
    position: 'absolute',
    right: 16,
    bottom: 20,
  },
});
