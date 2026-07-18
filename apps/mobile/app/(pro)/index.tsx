import React from 'react';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';

import type { ProAssignment } from '@easycasa/api-client';
import { useMyAssignments, useMyProfile } from '../../src/api/professional-hooks';
import { AssignmentCard } from '../../src/components/pro/AssignmentCard';
import { useTheme } from '../../src/theme/useTheme';

export default function ProInbox() {
  const theme = useTheme();
  const router = useRouter();
  const { t } = useTranslation();
  const profile = useMyProfile();
  const { data, isLoading, isError, refetch, isRefetching } = useMyAssignments();

  const open = (a: ProAssignment) => router.push(`/(pro)/${a.id}`);

  return (
    <View style={[styles.root, { backgroundColor: theme.colors.background }]}>
      <Pressable
        onPress={() => router.push('/(pro)/credentials')}
        style={[styles.header, { borderBottomColor: theme.colors.border }]}
      >
        <Text style={[styles.headerText, { color: theme.colors.text }]}>
          {profile.data
            ? t('pro.inbox.load', {
                active: profile.data.activeAssignments,
                max: profile.data.maxConcurrent,
              })
            : t('common.loading')}
        </Text>
        <Text style={[styles.headerLink, { color: theme.colors.primary }]}>{t('pro.creds.title')} ›</Text>
      </Pressable>

      {isLoading ? (
        <ActivityIndicator style={styles.center} color={theme.colors.primary} />
      ) : isError ? (
        <Text style={[styles.center, { color: theme.colors.danger }]}>{t('common.error')}</Text>
      ) : (
        <FlatList
          data={data ?? []}
          keyExtractor={(a) => a.id}
          renderItem={({ item }) => <AssignmentCard assignment={item} onPress={open} />}
          contentContainerStyle={styles.list}
          onRefresh={refetch}
          refreshing={isRefetching}
          ListEmptyComponent={
            <Text style={[styles.center, { color: theme.colors.textMuted }]}>{t('pro.inbox.empty')}</Text>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1,
  },
  headerText: { fontSize: 13, fontWeight: '600' },
  headerLink: { fontSize: 13, fontWeight: '600' },
  list: { padding: 16 },
  center: { textAlign: 'center', marginTop: 48 },
});
