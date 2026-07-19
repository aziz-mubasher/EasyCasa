import React, { useState } from 'react';
import { ActivityIndicator, Modal, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import type { EnquiryIntent } from '@easycasa/api-client';
import { useTheme } from '../../theme/useTheme';

const INTENTS: EnquiryIntent[] = ['info', 'viewing', 'offer'];

export function EnquiryModal({
  visible,
  submitting,
  onClose,
  onSubmit,
}: {
  visible: boolean;
  submitting: boolean;
  onClose: () => void;
  onSubmit: (v: { intent: EnquiryIntent; message: string; contactEmail?: string; contactPhone?: string }) => void;
}) {
  const theme = useTheme();
  const { t } = useTranslation();
  const [intent, setIntent] = useState<EnquiryIntent>('viewing');
  const [message, setMessage] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');

  const canSend = message.trim().length > 0 && (email.trim().length > 0 || phone.trim().length > 0) && !submitting;

  const submit = () => {
    const body: { intent: EnquiryIntent; message: string; contactEmail?: string; contactPhone?: string } = {
      intent,
      message: message.trim(),
    };
    if (email.trim()) body.contactEmail = email.trim();
    if (phone.trim()) body.contactPhone = phone.trim();
    onSubmit(body);
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={[styles.sheet, { backgroundColor: theme.colors.background, borderTopLeftRadius: 20, borderTopRightRadius: 20 }]}>
          <Text style={[styles.h, { color: theme.colors.text }]}>{t('enquiry.title')}</Text>

          <Text style={[styles.label, { color: theme.colors.textMuted }]}>{t('enquiry.intent')}</Text>
          <View style={styles.row}>
            {INTENTS.map((i) => (
              <Pressable
                key={i}
                onPress={() => setIntent(i)}
                style={[styles.chip, { backgroundColor: intent === i ? theme.colors.primary : theme.colors.surface, borderRadius: theme.radius.sm }]}
              >
                <Text style={{ color: intent === i ? theme.colors.primaryText : theme.colors.text, fontSize: 12, fontWeight: '600' }}>
                  {t(`enquiry.intents.${i}`)}
                </Text>
              </Pressable>
            ))}
          </View>

          <TextInput
            value={message}
            onChangeText={setMessage}
            placeholder={t('enquiry.message')}
            placeholderTextColor={theme.colors.textMuted}
            multiline
            style={[styles.textarea, { backgroundColor: theme.colors.surface, color: theme.colors.text, borderRadius: theme.radius.md }]}
          />
          <TextInput
            value={email}
            onChangeText={setEmail}
            placeholder={t('enquiry.email')}
            placeholderTextColor={theme.colors.textMuted}
            keyboardType="email-address"
            autoCapitalize="none"
            style={[styles.input, { backgroundColor: theme.colors.surface, color: theme.colors.text, borderRadius: theme.radius.md }]}
          />
          <TextInput
            value={phone}
            onChangeText={setPhone}
            placeholder={t('enquiry.phone')}
            placeholderTextColor={theme.colors.textMuted}
            keyboardType="phone-pad"
            style={[styles.input, { backgroundColor: theme.colors.surface, color: theme.colors.text, borderRadius: theme.radius.md }]}
          />

          <View style={styles.actions}>
            <Pressable onPress={onClose} style={styles.cancel}>
              <Text style={{ color: theme.colors.textMuted }}>{t('common.cancel')}</Text>
            </Pressable>
            <Pressable
              onPress={submit}
              disabled={!canSend}
              style={[styles.send, { backgroundColor: theme.colors.primary, borderRadius: theme.radius.md, opacity: canSend ? 1 : 0.5 }]}
            >
              {submitting ? (
                <ActivityIndicator color={theme.colors.primaryText} />
              ) : (
                <Text style={{ color: theme.colors.primaryText, fontWeight: '700' }}>{t('enquiry.send')}</Text>
              )}
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  sheet: { padding: 20, gap: 10 },
  h: { fontSize: 18, fontWeight: '700' },
  label: { fontSize: 12, fontWeight: '700', textTransform: 'uppercase', marginTop: 4 },
  row: { flexDirection: 'row', gap: 8 },
  chip: { paddingHorizontal: 14, paddingVertical: 8 },
  textarea: { minHeight: 88, padding: 12, fontSize: 15, textAlignVertical: 'top' },
  input: { height: 48, paddingHorizontal: 16, fontSize: 15 },
  actions: { flexDirection: 'row', gap: 12, marginTop: 6, alignItems: 'center' },
  cancel: { paddingHorizontal: 16, paddingVertical: 12 },
  send: { flex: 1, paddingVertical: 14, alignItems: 'center' },
});
