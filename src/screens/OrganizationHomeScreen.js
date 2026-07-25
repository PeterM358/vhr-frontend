import React, { useCallback, useContext, useEffect, useState } from 'react';
import { ScrollView, View } from 'react-native';
import { Button, Card, Text } from 'react-native-paper';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation } from '@react-navigation/native';

import { AuthContext } from '../context/AuthManager';
import ScreenBackground from '../components/ScreenBackground';
import OrgAppHeader from '../components/org/OrgAppHeader';
import { STORAGE_KEYS } from '../constants/storageKeys';
import {
  buildOrgNavItems,
  isFleetFocusedOrg,
  organizationMembershipFor,
  readOrganizationMemberships,
  setCurrentOrganizationId,
} from '../utils/orgWorkspace';
import { useTranslation } from '../i18n';
import {
  navigateToOrgFleet,
  navigateToOrgNetwork,
  navigateToPartnerDashboard,
} from '../navigation/webNavigation';

export default function OrganizationHomeScreen() {
  const navigation = useNavigation();
  const { t } = useTranslation();
  const { authToken } = useContext(AuthContext);
  const [org, setOrg] = useState(null);
  const [memberships, setMemberships] = useState([]);

  const load = useCallback(async () => {
    const rows = await readOrganizationMemberships();
    setMemberships(rows);
    const orgId = await AsyncStorage.getItem(STORAGE_KEYS.CURRENT_ORGANIZATION_ID);
    const active = organizationMembershipFor(rows, orgId) || rows[0] || null;
    setOrg(active);
  }, []);

  useEffect(() => {
    load();
  }, [load, authToken]);

  const fleetFocused = isFleetFocusedOrg(org);
  const navItems = buildOrgNavItems(org, t);

  const openSection = (route) => {
    if (route === 'OrgFleet') {
      navigateToOrgFleet(navigation, { orgId: org?.id });
      return;
    }
    if (route === 'OrgNetwork') {
      navigateToOrgNetwork(navigation, { orgId: org?.id });
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
  };

  const goRequestRepair = () => {
    navigation.navigate('CreateRepair', {
      mode: 'request',
      organizationId: org?.id,
      returnTo: 'OrgHome',
      origin: 'OrgHome',
    });
  };

  return (
    <ScreenBackground>
      <OrgAppHeader
        mode="dashboard"
        title={org?.display_name || t('org.home.title', null, 'Organization')}
      />
      <ScrollView contentContainerStyle={{ padding: 16, gap: 12 }}>
        <Text variant="bodyMedium">
          {fleetFocused
            ? t(
                'org.home.fleetSubtitle',
                null,
                'Manage your company fleet and request repairs the same way customers do.',
              )
            : t(
                'org.home.subtitle',
                null,
                'Shared workforce, fleet, documents, and operations for your company.',
              )}
        </Text>

        {memberships.length > 1 ? (
          <Card style={{ padding: 12 }}>
            <Text variant="titleSmall">{t('org.switcher.label', null, 'Organization')}</Text>
            {memberships.map((row) => (
              <Button
                key={row.id}
                mode={row.id === org?.id ? 'contained' : 'text'}
                onPress={() => switchOrganization(row)}
              >
                {row.display_name}
              </Button>
            ))}
          </Card>
        ) : null}

        {fleetFocused ? (
          <View style={{ gap: 8 }}>
            <Button
              mode="contained"
              onPress={() => navigateToOrgFleet(navigation, { orgId: org?.id })}
            >
              {t('fleet.openFleet', null, 'View fleet')}
            </Button>
            {org?.manage_fleet ? (
              <Button mode="contained-tonal" onPress={() => navigation.navigate('FleetRegisterImport')}>
                {t('fleetImport.openAction', null, 'Import fleet')}
              </Button>
            ) : null}
            <Button mode="outlined" onPress={goRequestRepair}>
              {t('org.home.requestRepair', null, 'Request repair')}
            </Button>
          </View>
        ) : (
          <>
            <Card style={{ padding: 12 }}>
              <Text variant="titleSmall">{t('org.home.modules', null, 'Workspace')}</Text>
              {navItems.map((item) => (
                <Button key={item.key} mode="text" onPress={() => openSection(item.route)}>
                  {item.label}
                </Button>
              ))}
            </Card>

            {org?.has_shop_locations ? (
              <Button mode="outlined" onPress={() => navigateToPartnerDashboard(navigation)}>
                {t('org.home.openServiceCenter', null, 'Open service center workspace')}
              </Button>
            ) : null}

            {org?.manage_fleet ? (
              <Button mode="contained-tonal" onPress={() => navigation.navigate('FleetRegisterImport')}>
                {t('org.home.importFleetLater', null, 'Import fleet later')}
              </Button>
            ) : null}

            {org?.manage_fleet || org?.can_view_fleet ? (
              <Button mode="outlined" onPress={goRequestRepair}>
                {t('org.home.requestRepair', null, 'Request repair')}
              </Button>
            ) : null}
          </>
        )}
      </ScrollView>
    </ScreenBackground>
  );
}
