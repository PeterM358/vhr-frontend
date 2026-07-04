import React, { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Text } from 'react-native-paper';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { COLORS } from '../../constants/colors';

const WORKFLOW_ITEMS = [
  '20-second guided safety check',
  'AI face verification',
  'Liveness detection',
  'Random reading challenge',
  'Speech clarity analysis',
  'Eye movement analysis',
  'Head movement analysis',
  'Simple reaction-time test',
  'Personalized driver baseline',
  'Daily readiness history',
  'Fleet dashboard',
  'Parent / Family mode',
  'Optional fleet telematics integration',
  'Optional certified Bluetooth breathalyzer integration',
  'Future vehicle authorization module',
];

const USE_CASES = [
  'Fleet operators',
  'Company vehicles',
  'Transport companies',
  'Delivery drivers',
  'Taxi fleets',
  'Construction companies',
  'Shared vehicles',
  'Families',
  'Young drivers',
  'Optional late-night safety mode for inexperienced drivers',
];

const ENTERPRISE_FEATURES = [
  'Fleet dashboard',
  'Daily driver readiness reports',
  'Driver history',
  'Safety analytics',
  'Emergency override logging',
  'API integrations',
  'Telematics integrations',
  'Driver authorization before vehicle use',
];

const RESULTS = [
  { emoji: '🟢', label: 'Ready' },
  { emoji: '🟡', label: 'Repeat Check' },
  { emoji: '🔴', label: 'Contact Supervisor' },
];

function BulletList({ items }) {
  return (
    <View style={styles.bulletList}>
      {items.map((item) => (
        <View key={item} style={styles.bulletRow}>
          <Text style={styles.bulletDot}>•</Text>
          <Text style={styles.bulletText}>{item}</Text>
        </View>
      ))}
    </View>
  );
}

function SectionBlock({ title, children }) {
  return (
    <View style={styles.sectionBlock}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {children}
    </View>
  );
}

/** Premium Coming Soon placeholder — vision only, no backend or navigation. */
export default function ReadyToDriveComingSoonCard() {
  const [expanded, setExpanded] = useState(false);

  return (
    <Pressable
      onPress={() => setExpanded((prev) => !prev)}
      style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
      accessibilityRole="button"
      accessibilityState={{ expanded }}
    >
      <View style={styles.accentStripe} />

      <View style={styles.headerRow}>
        <View style={styles.iconWrap}>
          <MaterialCommunityIcons name="car-connected" size={24} color="#fff" />
        </View>
        <View style={styles.headerText}>
          <Text style={styles.title}>Ready to Drive AI</Text>
          <Text style={styles.subtitle}>20-second AI safety check before every drive.</Text>
        </View>
        <View style={styles.badge}>
          <Text style={styles.badgeText}>Coming soon</Text>
        </View>
      </View>

      <Text style={styles.teaser}>
        Pre-start readiness for fleets, businesses, families and young drivers — not alcohol
        testing, but fatigue, focus and safety indicators before the engine starts.
      </Text>

      <View style={styles.expandHintRow}>
        <Text style={styles.expandHint}>
          {expanded ? 'Tap to collapse vision' : 'Tap to explore the future platform'}
        </Text>
        <MaterialCommunityIcons
          name={expanded ? 'chevron-up' : 'chevron-down'}
          size={20}
          color={COLORS.PRIMARY}
        />
      </View>

      {expanded ? (
        <View style={styles.body}>
          <SectionBlock title="Description">
            <Text style={styles.paragraph}>
              Ready to Drive AI is a future safety platform designed for fleet operators,
              businesses, families and young drivers.
            </Text>
            <Text style={styles.paragraph}>
              Unlike traditional systems that monitor drivers only after the vehicle starts moving,
              Ready to Drive AI performs a short interactive readiness assessment before the engine
              is started.
            </Text>
            <Text style={styles.paragraph}>
              The system is not intended to detect alcohol or drugs. Instead, it evaluates whether
              the driver appears ready to operate a vehicle by combining multiple safety indicators.
            </Text>
            <Text style={styles.paragraph}>
              The long-term vision is to reduce accidents caused by fatigue, distraction, illness,
              reduced concentration or other conditions that may affect safe driving.
            </Text>
          </SectionBlock>

          <SectionBlock title="Future workflow">
            <BulletList items={WORKFLOW_ITEMS} />
          </SectionBlock>

          <SectionBlock title="Possible results">
            <View style={styles.resultsRow}>
              {RESULTS.map((result) => (
                <View key={result.label} style={styles.resultPill}>
                  <Text style={styles.resultEmoji}>{result.emoji}</Text>
                  <Text style={styles.resultLabel}>{result.label}</Text>
                </View>
              ))}
            </View>
          </SectionBlock>

          <SectionBlock title="Future use cases">
            <BulletList items={USE_CASES} />
          </SectionBlock>

          <SectionBlock title="Privacy">
            <Text style={styles.paragraph}>Privacy-first architecture.</Text>
            <Text style={styles.paragraph}>
              The long-term goal is to avoid storing successful verification videos longer than
              necessary.
            </Text>
            <Text style={styles.paragraph}>Future versions should retain only:</Text>
            <BulletList
              items={[
                'readiness score',
                'anonymized analytical metrics',
                'encrypted biometric template (if required)',
              ]}
            />
            <Text style={styles.paragraphMuted}>
              Video retention should be configurable by company policy and applicable regulations.
            </Text>
          </SectionBlock>

          <SectionBlock title="Future enterprise features">
            <BulletList items={ENTERPRISE_FEATURES} />
          </SectionBlock>
        </View>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    marginTop: 12,
    marginBottom: 4,
    borderRadius: 18,
    padding: 16,
    backgroundColor: '#f0f7ff',
    borderWidth: 1,
    borderColor: 'rgba(37,99,235,0.22)',
    overflow: 'hidden',
    shadowColor: '#1e3a8a',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 3,
  },
  cardPressed: {
    opacity: 0.96,
  },
  accentStripe: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 4,
    backgroundColor: COLORS.PRIMARY,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    paddingLeft: 4,
  },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: COLORS.PRIMARY,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerText: {
    flex: 1,
    paddingTop: 2,
  },
  title: {
    fontSize: 16,
    fontWeight: '800',
    color: COLORS.TEXT_DARK,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1e40af',
    lineHeight: 18,
  },
  badge: {
    backgroundColor: 'rgba(37,99,235,0.12)',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderWidth: 1,
    borderColor: 'rgba(37,99,235,0.25)',
  },
  badgeText: {
    fontSize: 9,
    fontWeight: '800',
    color: COLORS.PRIMARY,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  teaser: {
    marginTop: 12,
    marginLeft: 4,
    fontSize: 12,
    lineHeight: 18,
    color: COLORS.TEXT_MUTED,
  },
  expandHintRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 12,
    marginLeft: 4,
    paddingTop: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(37,99,235,0.15)',
  },
  expandHint: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.PRIMARY,
  },
  body: {
    marginTop: 14,
    marginLeft: 4,
    gap: 14,
  },
  sectionBlock: {
    gap: 6,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: COLORS.TEXT_DARK,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  paragraph: {
    fontSize: 12,
    lineHeight: 18,
    color: COLORS.TEXT_DARK,
  },
  paragraphMuted: {
    fontSize: 12,
    lineHeight: 18,
    color: COLORS.TEXT_MUTED,
    fontStyle: 'italic',
  },
  bulletList: {
    gap: 4,
  },
  bulletRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
  },
  bulletDot: {
    fontSize: 12,
    lineHeight: 18,
    color: COLORS.PRIMARY,
    fontWeight: '700',
  },
  bulletText: {
    flex: 1,
    fontSize: 12,
    lineHeight: 18,
    color: COLORS.TEXT_DARK,
  },
  resultsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  resultPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#fff',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: 'rgba(15,23,42,0.08)',
  },
  resultEmoji: {
    fontSize: 14,
  },
  resultLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.TEXT_DARK,
  },
});
