import React from 'react';
import { Redirect } from 'expo-router';

/** Legacy map tab → Phase 23 discovery (same experience). */
export default function MapTab() {
  return <Redirect href="/(search)" />;
}
