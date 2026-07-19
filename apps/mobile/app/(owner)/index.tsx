import React from 'react';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';

import type { OwnerProperty } from '@easycasa/api-client';
import { useInboundEnquiries } from '../../src/api/enquiries';
import { useMyProperties } from '../../src/api/owner-hooks';
import { useTheme } from '../../src/theme/useTheme';

export default function OwnerHome() {
  const theme = useTheme();
  const router = useRouter();
  const { t } = useTranslation();
  const { data, isLoading, isError } = useMyProperties();
  const { data: inbound } = useInboundEnquiries();
  const newCount = (inbound ?? []).filter((e) => e.status === 'NEW').length;

  const renderItem = ({ item }: { item: OwnerProperty }) => (
    <View style={[styles.card, { backgroundColor: theme.colors.surface, borderRadius: theme.radius.md }]}>
      <Text style={[styles.title, { color: theme.colors.text }]}>
        {item.title ?? t('owner.untitled')}
      </Text>
      <Text style={[styles.status, { color: theme.colors.textMuted }]}>
        {t('owner.dealType.' + item.dealType)} · {item.status}
      </Text>
      <View style={styles.actions}>
        <Pressable
          onPress={() => router.push(`/(owner)/${item.id}/fascicolo`)}
          style={[styles.action, { borderColor: theme.colors.border, borderRadius: theme.radius.sm }]}
        >
          <Text style={{ color: theme.colors.primary, fontWeight: '600' }}>
            {t('owner.fascicolo.title')}
          </Text>
        </Pressable>
        <Pressable
          onPress={() => router.push(`/(owner)/${item.id}/services`)}
          style={[styles.action, { borderColor: theme.colors.border, borderRadius: theme.radius.sm }]}
        >
          <Text style={{ color: theme.colors.primary, fontWeight: '600' }}>
            {t('owner.services.title')}
          </Text>
        </Pressable>
        <Pressable
          onPress={() => router.push(`/(owner)/${item.id}/lease`)}
          style={[styles.action, { borderColor: theme.colors.border, borderRadius: theme.radius.sm }]}
        >
          <Text style={{ color: theme.colors.primary, fontWeight: '600' }}>
            {t('owner.lease.title')}
          </Text>
        </Pressable>
      </View>
    </View>
  );

  return (
    <View style={[styles.root, { backgroundColor: theme.colors.background }]}>
      <Pressable
        onPress={() => router.push('/(owner)/enquiries')}
        style={[
          styles.inboxBanner,
          {
            backgroundColor: theme.colors.surface,
            borderColor: theme.colors.border,
            borderRadius: theme.radius.md,
          },
        ]}
      >
        <Text style={[styles.inboxTitle, { color: theme.colors.text }]}>
          {t('enquiryInbox.nav')}
        </Text>
        <Text style={{ color: newCount > 0 ? theme.colors.primary : theme.colors.textMuted, fontWeight: '700' }}>
          {newCount > 0 ? t('enquiryInbox.badgeNew', { count: newCount }) : '→'}
        </Text>
      </Pressable>

      {isLoading ? (
        <ActivityIndicator style={styles.center} color={theme.colors.primary} />
      ) : isError ? (
        <Text style={[styles.center, { color: theme.colors.danger }]}>{t('common.error')}</Text>
      ) : (
        <FlatList
          data={data ?? []}
          keyExtractor={(p) => p.id}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            <Text style={[styles.center, { color: theme.colors.textMuted }]}>
              {t('owner.empty')}
            </Text>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  inboxBanner: {
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 4,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  inboxTitle: { fontSize: 16, fontWeight: '700' },
  list: { padding: 16 },
  card: { padding: 16, marginBottom: 12, gap: 6 },
  title: { fontSize: 17, fontWeight: '700' },
  status: { fontSize: 13 },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 8 },
  action: { paddingHorizontal: 14, paddingVertical: 8, borderWidth: 1 },
  center: { textAlign: 'center', marginTop: 48 },
});
