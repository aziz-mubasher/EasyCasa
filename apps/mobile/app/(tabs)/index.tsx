import React from 'react';
import { Redirect } from 'expo-router';

/** Default landing tab → Phase 23 map discovery. */
export default function SearchTab() {
  return <Redirect href="/(search)" />;
}
