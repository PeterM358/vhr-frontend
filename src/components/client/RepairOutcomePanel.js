import React, { useMemo, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Button, Switch, Text, TextInput } from 'react-native-paper';
import AsyncStorage from '@react-native-async-storage/async-storage';

import AppCard from '../ui/AppCard';
import { createClientComplaint, createShopReview } from '../../api/erp';
import { showMessage } from '../../utils/crossPlatformAlert';
import { useTranslation } from '../../i18n';
import { COLORS } from '../../constants/colors';

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

function starsLabel(rating) {
  const n = Math.max(0, Math.min(5, Number(rating) || 0));
  return `${'★'.repeat(n)}${'☆'.repeat(5 - n)}`;
}

export default function RepairOutcomePanel({ repair, shopProfileId, onSubmitted }) {
  const { t } = useTranslation();
  const existingReview = repair?.my_review || null;
  const existingComplaint = Boolean(repair?.has_my_complaint);

  const [rating, setRating] = useState(existingReview?.rating || 5);
  const [problemSolved, setProblemSolved] = useState(
    existingReview?.problem_solved != null ? Boolean(existingReview.problem_solved) : true,
  );
  const [wouldRecommend, setWouldRecommend] = useState(
    existingReview?.would_recommend != null ? Boolean(existingReview.would_recommend) : true,
  );
  const [comment, setComment] = useState('');
  const [complaintSubject, setComplaintSubject] = useState('');
  const [complaintBody, setComplaintBody] = useState('');
  const [submittingReview, setSubmittingReview] = useState(false);
  const [submittingComplaint, setSubmittingComplaint] = useState(false);
  const [reviewDone, setReviewDone] = useState(Boolean(existingReview));
  const [complaintDone, setComplaintDone] = useState(existingComplaint);
  const [submittedRating, setSubmittedRating] = useState(existingReview?.rating || null);
  const [complaintExpanded, setComplaintExpanded] = useState(false);

  const collapsed = reviewDone;

  const bubbleText = useMemo(() => {
    const ratingValue = submittedRating || rating;
    if (complaintDone) {
      return t(
        'erp.review.ratedWithComplaintBubble',
        { rating: ratingValue },
        `Rated ${ratingValue}/5 · complaint filed`,
      );
    }
    return t(
      'erp.review.ratedNoComplaintBubble',
      { rating: ratingValue },
      `Rated ${ratingValue}/5 · no complaint`,
    );
  }, [complaintDone, rating, submittedRating, t]);

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
      setSubmittedRating(rating);
      setReviewDone(true);
      setComplaintExpanded(false);
      showMessage(t('erp.review.title'), t('erp.documentImports.confirmSuccess'), { variant: 'success' });
      onSubmitted?.('review');
    } catch (e) {
      const msg = e.message || '';
      if (/already exists|already submitted/i.test(msg)) {
        setSubmittedRating(rating);
        setReviewDone(true);
        setComplaintExpanded(false);
        showMessage(t('erp.review.title'), t('erp.review.alreadySubmitted'), { variant: 'info' });
        onSubmitted?.('review');
      } else {
        showMessage(t('erp.common.error'), msg, { variant: 'error' });
      }
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
      setComplaintDone(true);
      setComplaintExpanded(false);
      showMessage(t('erp.clientComplaint.title'), t('erp.documentImports.confirmSuccess'), {
        variant: 'success',
      });
      onSubmitted?.('complaint');
    } catch (e) {
      const msg = e.message || '';
      if (/already exists|already filed/i.test(msg)) {
        setComplaintDone(true);
        setComplaintExpanded(false);
        showMessage(t('erp.clientComplaint.title'), t('erp.clientComplaint.alreadyFiled'), {
          variant: 'info',
        });
        onSubmitted?.('complaint');
      } else {
        showMessage(t('erp.common.error'), msg, { variant: 'error' });
      }
    } finally {
      setSubmittingComplaint(false);
    }
  };

  if (collapsed) {
    return (
      <View style={styles.wrap}>
        <View style={styles.bubble}>
          <Text style={styles.bubbleStars}>{starsLabel(submittedRating || rating)}</Text>
          <Text style={styles.bubbleText}>{bubbleText}</Text>
          {!complaintDone ? (
            <Pressable
              onPress={() => setComplaintExpanded((prev) => !prev)}
              style={styles.bubbleLinkHit}
              accessibilityRole="button"
            >
              <Text style={styles.bubbleLink}>
                {complaintExpanded
                  ? t('erp.clientComplaint.hideForm', null, 'Hide')
                  : t('erp.clientComplaint.title')}
              </Text>
            </Pressable>
          ) : null}
        </View>

        {complaintExpanded && !complaintDone ? (
          <AppCard>
            <Text variant="titleMedium">{t('erp.clientComplaint.title')}</Text>
            <TextInput
              label={t('erp.clientComplaint.subject')}
              value={complaintSubject}
              onChangeText={setComplaintSubject}
            />
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
        ) : null}
      </View>
    );
  }

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
        <TextInput
          label={t('erp.clientComplaint.subject')}
          value={complaintSubject}
          onChangeText={setComplaintSubject}
        />
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
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginVertical: 6,
  },
  bubble: {
    alignSelf: 'stretch',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    backgroundColor: 'rgba(15,76,129,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(15,76,129,0.18)',
    gap: 4,
  },
  bubbleStars: {
    color: COLORS.PRIMARY,
    fontSize: 16,
    letterSpacing: 1,
  },
  bubbleText: {
    color: COLORS.TEXT_DARK,
    fontWeight: '600',
    fontSize: 14,
  },
  bubbleLinkHit: { alignSelf: 'flex-start', marginTop: 4 },
  bubbleLink: {
    color: COLORS.PRIMARY,
    fontWeight: '700',
    fontSize: 13,
  },
});
