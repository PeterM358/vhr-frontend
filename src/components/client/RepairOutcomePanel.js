import React, { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Button, Switch, Text, TextInput } from 'react-native-paper';
import AsyncStorage from '@react-native-async-storage/async-storage';

import AppCard from '../ui/AppCard';
import { createClientComplaint, createShopReview } from '../../api/erp';
import { showMessage } from '../../utils/crossPlatformAlert';
import { useTranslation } from '../../i18n';

function StarRow({ value, onChange }) {
  return (
    <View style={styles.starRow}>
      {[1, 2, 3, 4, 5].map((star) => (
        <Button key={star} compact onPress={() => onChange(star)}>
          {star <= value ? '★' : '☆'}
        </Button>
      ))}
    </View>
  );
}

export default function RepairOutcomePanel({ repair, shopProfileId, onSubmitted }) {
  const { t } = useTranslation();
  const [rating, setRating] = useState(5);
  const [problemSolved, setProblemSolved] = useState(true);
  const [wouldRecommend, setWouldRecommend] = useState(true);
  const [comment, setComment] = useState('');
  const [complaintSubject, setComplaintSubject] = useState('');
  const [complaintBody, setComplaintBody] = useState('');
  const [submittingReview, setSubmittingReview] = useState(false);
  const [submittingComplaint, setSubmittingComplaint] = useState(false);

  if (!repair || repair.status !== 'done' || !shopProfileId) {
    return null;
  }

  const submitReview = async () => {
    setSubmittingReview(true);
    try {
      const token = await AsyncStorage.getItem('@access_token');
      await createShopReview(token, shopProfileId, {
        repair_id: repair.id,
        rating,
        text: comment,
        problem_solved: problemSolved,
        would_recommend: wouldRecommend,
      });
      showMessage(t('erp.review.title'), t('erp.documentImports.confirmSuccess'), { variant: 'success' });
      onSubmitted?.('review');
    } catch (e) {
      showMessage(t('erp.common.error'), e.message || '', { variant: 'error' });
    } finally {
      setSubmittingReview(false);
    }
  };

  const submitComplaint = async () => {
    if (!complaintSubject.trim() || !complaintBody.trim()) return;
    setSubmittingComplaint(true);
    try {
      const token = await AsyncStorage.getItem('@access_token');
      await createClientComplaint(token, {
        repair_id: repair.id,
        subject: complaintSubject.trim(),
        description: complaintBody.trim(),
      });
      showMessage(t('erp.clientComplaint.title'), t('erp.documentImports.confirmSuccess'), { variant: 'success' });
      onSubmitted?.('complaint');
    } catch (e) {
      showMessage(t('erp.common.error'), e.message || '', { variant: 'error' });
    } finally {
      setSubmittingComplaint(false);
    }
  };

  return (
    <View style={styles.wrap}>
      <AppCard>
        <Text variant="titleMedium">{t('erp.review.title')}</Text>
        <Text>{t('erp.review.rating')}</Text>
        <StarRow value={rating} onChange={setRating} />
        <View style={styles.switchRow}>
          <Text>{t('erp.review.problemSolved')}</Text>
          <Switch value={problemSolved} onValueChange={setProblemSolved} />
        </View>
        <View style={styles.switchRow}>
          <Text>{t('erp.review.recommend')}</Text>
          <Switch value={wouldRecommend} onValueChange={setWouldRecommend} />
        </View>
        <TextInput
          label={t('erp.review.comment')}
          value={comment}
          onChangeText={setComment}
          multiline
        />
        <Button mode="contained" onPress={submitReview} loading={submittingReview}>
          {t('erp.review.submit')}
        </Button>
      </AppCard>

      <AppCard>
        <Text variant="titleMedium">{t('erp.clientComplaint.title')}</Text>
        <TextInput label={t('erp.clientComplaint.subject')} value={complaintSubject} onChangeText={setComplaintSubject} />
        <TextInput
          label={t('erp.clientComplaint.description')}
          value={complaintBody}
          onChangeText={setComplaintBody}
          multiline
        />
        <Button mode="outlined" onPress={submitComplaint} loading={submittingComplaint}>
          {t('erp.clientComplaint.submit')}
        </Button>
      </AppCard>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 12, marginTop: 12 },
  starRow: { flexDirection: 'row', flexWrap: 'wrap' },
  switchRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginVertical: 6 },
});
