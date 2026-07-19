import React, { useState } from 'react';
import { ActivityIndicator, Modal, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import type { AlertFrequency } from '@easycasa/api-client';
import { useTheme } from '../../theme/useTheme';

const FREQS: AlertFrequency[] = ['instant', 'daily', 'off'];

export function SaveSearchModal({
  visible,
  saving,
  onClose,
  onSave,
}: {
  visible: boolean;
  saving: boolean;
  onClose: () => void;
  onSave: (name: string, frequency: AlertFrequency) => void;
}) {
  const theme = useTheme();
  const { t } = useTranslation();
  const [name, setName] = useState('');
  const [freq, setFreq] = useState<AlertFrequency>('instant');

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={[styles.sheet, { backgroundColor: theme.colors.background, borderRadius: theme.radius.lg }]}>
          <Text style={[styles.h, { color: theme.colors.text }]}>{t('discovery.save.title')}</Text>
          <TextInput
            value={name}
            onChangeText={setName}
            placeholder={t('discovery.save.name')}
            placeholderTextColor={theme.colors.textMuted}
            style={[styles.input, { backgroundColor: theme.colors.surface, color: theme.colors.text, borderRadius: theme.radius.md }]}
          />
          <Text style={[styles.label, { color: theme.colors.textMuted }]}>{t('discovery.save.frequency')}</Text>
          <View style={styles.row}>
            {FREQS.map((f) => (
              <Pressable
                key={f}
                onPress={() => setFreq(f)}
                style={[styles.chip, { backgroundColor: freq === f ? theme.colors.primary : theme.colors.surface, borderRadius: theme.radius.sm }]}
              >
                <Text style={{ color: freq === f ? theme.colors.primaryText : theme.colors.text, fontSize: 12, fontWeight: '600' }}>
                  {t(`discovery.freq.${f}`)}
                </Text>
              </Pressable>
            ))}
          </View>
          <View style={styles.actions}>
            <Pressable onPress={onClose} style={styles.cancel}>
              <Text style={{ color: theme.colors.textMuted }}>{t('common.cancel')}</Text>
            </Pressable>
            <Pressable
              onPress={() => onSave(name.trim() || t('discovery.save.default'), freq)}
              disabled={saving}
              style={[styles.save, { backgroundColor: theme.colors.primary, borderRadius: theme.radius.md }]}
            >
              {saving ? (
                <ActivityIndicator color={theme.colors.primaryText} />
              ) : (
                <Text style={{ color: theme.colors.primaryText, fontWeight: '700' }}>{t('common.save')}</Text>
              )}
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 24 },
  sheet: { padding: 20, gap: 10 },
  h: { fontSize: 18, fontWeight: '700' },
  input: { height: 48, paddingHorizontal: 16, fontSize: 15 },
  label: { fontSize: 12, fontWeight: '700', textTransform: 'uppercase', marginTop: 4 },
  row: { flexDirection: 'row', gap: 8 },
  chip: { paddingHorizontal: 14, paddingVertical: 8 },
  actions: { flexDirection: 'row', gap: 12, marginTop: 8, alignItems: 'center' },
  cancel: { paddingHorizontal: 16, paddingVertical: 12 },
  save: { flex: 1, paddingVertical: 14, alignItems: 'center' },
});
