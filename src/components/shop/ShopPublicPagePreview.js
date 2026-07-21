import React from 'react';
import { View, StyleSheet, Image, ScrollView, Pressable } from 'react-native';
import { Text, Chip, Divider } from 'react-native-paper';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';

import AppCard from '../ui/AppCard';
import FloatingCard from '../ui/FloatingCard';
import { COLORS } from '../../constants/colors';
import { useTranslation } from '../../i18n';
import { joinLocalizedList } from '../../i18n/joinLocalizedList';
import { translateRepairTypeLabels, translateVehicleTypePublicLabels, translateRepairTypeLabel } from '../../utils/translateShopTypeLabels';
import { getOperationIcon } from '../../icons/operationIconRegistry';
import { describeServicePricing } from '../../utils/servicePricingSummary';
import { openShopInMaps, resolveShopMapsUrl } from '../../utils/shopMapsLink';
import { formatDayHoursWithLunch, parseLunchBreak } from '../../utils/shopWorkingHours';

const DAY_LABEL = {
  monday: 'Monday',
  tuesday: 'Tuesday',
  wednesday: 'Wednesday',
  thursday: 'Thursday',
  friday: 'Friday',
  saturday: 'Saturday',
  sunday: 'Sunday',
};

function SectionHeading({ title }) {
  return <Text style={styles.sectionHeading}>{title}</Text>;
}

function ChipWrap({ labels, emptyLabel }) {
  if (!labels?.length) {
    return <Text style={styles.placeholderMuted}>{emptyLabel}</Text>;
  }
  return (
    <View style={styles.chipWrap}>
      {labels.map((label, i) => (
        <Chip key={`${label}-${i}`} mode="outlined" compact style={styles.chip} textStyle={styles.chipText}>
          {label}
        </Chip>
      ))}
    </View>
  );
}

function hoursPreviewRows(hoursMap) {
  if (!hoursMap || typeof hoursMap !== 'object') return [];
  const lunch = parseLunchBreak(hoursMap);
  return Object.keys(DAY_LABEL).map((key) => ({
    label: DAY_LABEL[key],
    text: formatDayHoursWithLunch(hoursMap[key], lunch),
  }));
}

/**
 * Client-facing shop page preview while editing profile.
 */
export default function ShopPublicPagePreview({
  shopName,
  vehicleTypeNames = [],
  repairTypeNames = [],
  address = '',
  cityName = '',
  countryName = '',
  googleMapsUrl = '',
  latitude = null,
  longitude = null,
  phone = '',
  generatedSummary = '',
  userDescription = '',
  workingHours = {},
  publishedMenuItems = [],
  offersGuarantee = false,
  images = [],
  brandNames = [],
}) {
  const { t, locale } = useTranslation();
  const genericServiceCenter = t('public.serviceCenter');

  const rawName = String(shopName || '').trim();
  const name = rawName || genericServiceCenter;

  const vehicleTypeLabels = translateVehicleTypePublicLabels(vehicleTypeNames, t);
  const repairTypeLabels = translateRepairTypeLabels(repairTypeNames, t);

  const subtitle = vehicleTypeLabels.length ? joinLocalizedList(vehicleTypeLabels, locale) : genericServiceCenter;
  const locationLine = [address, cityName, countryName].filter(Boolean).join(', ');
  const vehicleListText = vehicleTypeLabels.length ? joinLocalizedList(vehicleTypeLabels, locale) : '';
  const servicesListText = repairTypeLabels.length ? joinLocalizedList(repairTypeLabels, locale) : '';
  const vehiclePhrase = vehicleListText
    ? t('serviceCenterProfile.vehiclePhrase', { vehicleTypes: vehicleListText })
    : '';
  const servicesPhrase = servicesListText
    ? t('serviceCenterProfile.servicesPhrase', { services: servicesListText })
    : '';
  const locationPhrase = locationLine ? t('serviceCenterProfile.locationPhrase', { locationLine }) : '';

  const aboutLead = t('serviceCenterProfile.aboutTemplate', {
    serviceCenterName: name,
    vehiclePhrase,
    servicesPhrase,
    locationPhrase,
  });

  const mapsUrl = resolveShopMapsUrl({
    googleMapsUrl,
    latitude,
    longitude,
    address,
    cityName,
    countryName,
  });
  const hoursRows = hoursPreviewRows(workingHours);
  const photoList = Array.isArray(images) ? images : [];

  return (
    <View style={styles.wrap}>
      <Text style={styles.previewLabel}>{t('partnerProfile.previewHowClientsSee')}</Text>

      <AppCard variant="dark" contentStyle={styles.heroInner}>
        <Text style={styles.heroTitle}>{name}</Text>
        <Text style={styles.heroSubtitle}>{subtitle}</Text>
        {offersGuarantee ? (
          <View style={styles.guaranteeRow}>
            <MaterialCommunityIcons name="shield-check" size={18} color="rgba(255,255,255,0.88)" />
            <Text style={styles.guaranteeText}>{t('serviceCenters.profile.offersGuarantee')}</Text>
          </View>
        ) : null}

        <Divider style={styles.heroDivider} />

        {locationLine ? (
          <Pressable
            onPress={() =>
              openShopInMaps({
                googleMapsUrl,
                latitude,
                longitude,
                address,
                cityName,
                countryName,
              })
            }
            disabled={!mapsUrl}
            hitSlop={8}
            style={({ pressed }) => [styles.heroIconRow, pressed && mapsUrl && styles.heroIconRowPressed]}
          >
            <MaterialCommunityIcons name="map-marker-outline" size={22} color="rgba(255,255,255,0.92)" />
            <Text style={[styles.heroRowText, mapsUrl && styles.heroRowLink]}>{locationLine}</Text>
          </Pressable>
        ) : (
          <Text style={styles.heroMuted}>Add a map pin to show your address</Text>
        )}

        {phone ? (
          <View style={styles.heroIconRow}>
            <MaterialCommunityIcons name="phone-outline" size={22} color="rgba(255,255,255,0.92)" />
            <Text style={styles.heroRowText}>{phone}</Text>
          </View>
        ) : null}
      </AppCard>

      {photoList.length > 0 ? (
        <>
          <SectionHeading title={t('serviceCenters.profile.photos')} />
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.photoRow}>
            {photoList.map((img) => (
              <Image
                key={img.id}
                source={{ uri: img.thumbnail_url || img.image_url }}
                style={styles.photoThumb}
              />
            ))}
          </ScrollView>
        </>
      ) : null}

      <SectionHeading title={t('serviceCenters.profile.about')} />
      <FloatingCard>
        <Text style={styles.aboutLead}>
          {aboutLead}
        </Text>
        {userDescription ? <Text style={styles.aboutBody}>{userDescription}</Text> : null}
      </FloatingCard>

      <SectionHeading title={t('serviceCenters.profile.services')} />
      <FloatingCard>
        <ChipWrap labels={repairTypeLabels} emptyLabel={t('serviceCenters.profile.servicesNotAdded')} />
      </FloatingCard>

      {publishedMenuItems.length > 0 ? (
        <>
          <SectionHeading title={t('serviceCenters.profile.publishedPricing')} />
          <FloatingCard>
            <Text style={styles.menuDisclaimer}>
              {publishedMenuItems.some(
                (item) => item?.parts_from != null || item?.parts_to != null
              )
                ? t('serviceCenters.profile.partsIncludedNote')
                : t('serviceCenters.profile.partsQuotedSeparately')}
            </Text>
            {publishedMenuItems.map((item) => {
              const label = translateRepairTypeLabel(item, t) || t('common.service');
              const { parts, labor, total, time, hasParts } =
                describeServicePricing(item, t);
              const priceLine =
                (hasParts && total) || labor || t('serviceCenters.profile.priceOnRequest');
              const breakdown = hasParts
                ? [parts, labor].filter(Boolean).join(' · ')
                : null;
              return (
                <View key={`${item.id || label}-${label}`} style={styles.menuRow}>
                  <View style={styles.menuIconCircle}>
                    <MaterialCommunityIcons
                      name={getOperationIcon(item)}
                      size={20}
                      color={COLORS.PRIMARY}
                    />
                  </View>
                  <View style={styles.menuTextCol}>
                    <Text style={styles.menuServiceName}>{label}</Text>
                    <Text style={styles.menuPriceLine}>{priceLine}</Text>
                    {breakdown ? (
                      <Text style={styles.menuDisclaimer}>{breakdown}</Text>
                    ) : null}
                    {time ? <Text style={styles.menuDisclaimer}>{time}</Text> : null}
                  </View>
                </View>
              );
            })}
          </FloatingCard>
        </>
      ) : null}

      <SectionHeading title={t('serviceCenters.profile.vehicleTypes')} />
      <FloatingCard>
        <ChipWrap labels={vehicleTypeLabels} emptyLabel={t('serviceCenters.profile.vehicleTypesNotAdded')} />
      </FloatingCard>

      {brandNames.length > 0 ? (
        <>
          <SectionHeading title={t('serviceCenters.profile.brands')} />
          <FloatingCard>
            <ChipWrap labels={brandNames} emptyLabel={t('serviceCenters.profile.servicesNotAdded')} />
          </FloatingCard>
        </>
      ) : null}

      <SectionHeading title={t('serviceCenters.profile.workingHours')} />
      <FloatingCard>
        {hoursRows.length ? (
          hoursRows.map((row) => (
            <View key={row.label} style={styles.hoursRow}>
              <Text style={styles.hoursDay}>{row.label}</Text>
              <Text style={styles.hoursTime}>{row.text}</Text>
            </View>
          ))
        ) : (
          <Text style={styles.placeholderMuted}>Weekdays 09:00–18:00 (default)</Text>
        )}
      </FloatingCard>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginTop: 4,
  },
  previewLabel: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 10,
  },
  sectionHeading: {
    marginTop: 12,
    marginBottom: 8,
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  heroInner: {
    paddingBottom: 4,
  },
  heroTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#fff',
  },
  heroSubtitle: {
    marginTop: 4,
    fontSize: 14,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.88)',
  },
  guaranteeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
    gap: 8,
  },
  guaranteeText: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.88)',
    fontWeight: '600',
  },
  heroDivider: {
    marginTop: 12,
    marginBottom: 4,
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  heroIconRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginTop: 10,
    gap: 10,
  },
  heroIconRowPressed: {
    opacity: 0.85,
  },
  heroRowText: {
    flex: 1,
    fontSize: 14,
    lineHeight: 20,
    color: 'rgba(255,255,255,0.95)',
  },
  heroRowLink: {
    color: '#93c5fd',
    textDecorationLine: 'underline',
  },
  heroMuted: {
    marginTop: 10,
    fontSize: 13,
    color: 'rgba(255,255,255,0.65)',
    fontStyle: 'italic',
  },
  aboutLead: {
    fontSize: 14,
    lineHeight: 22,
    color: COLORS.TEXT_DARK,
    fontWeight: '600',
  },
  aboutBody: {
    marginTop: 10,
    fontSize: 14,
    lineHeight: 21,
    color: COLORS.TEXT_MUTED,
  },
  chipWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    backgroundColor: 'rgba(255,255,255,0.92)',
    borderColor: 'rgba(15,23,42,0.12)',
  },
  chipText: {
    fontSize: 12,
  },
  placeholderMuted: {
    fontSize: 13,
    color: COLORS.TEXT_MUTED,
    fontStyle: 'italic',
  },
  hoursRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(15,23,42,0.08)',
  },
  hoursDay: {
    fontWeight: '600',
    color: COLORS.TEXT_DARK,
    fontSize: 13,
  },
  hoursTime: {
    color: COLORS.TEXT_MUTED,
    fontSize: 13,
  },
  menuRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(15,23,42,0.08)',
  },
  menuIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(37,99,235,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuTextCol: {
    flex: 1,
  },
  menuServiceName: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.TEXT_DARK,
  },
  menuPriceLine: {
    fontSize: 13,
    color: COLORS.PRIMARY,
    fontWeight: '600',
    marginTop: 2,
  },
  menuDisclaimer: {
    fontSize: 12,
    color: COLORS.TEXT_MUTED,
    marginBottom: 8,
    lineHeight: 16,
  },
  photoRow: {
    marginBottom: 4,
  },
  photoThumb: {
    width: 108,
    height: 72,
    borderRadius: 10,
    marginRight: 8,
    backgroundColor: '#e5e7eb',
  },
});
