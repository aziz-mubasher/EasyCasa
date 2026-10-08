import React, { useState } from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';
import { useRouter } from 'expo-router';

import { BackHeader, PriButton, ScreenScroll } from '../src/components/shell/ui';
import { useFlow } from '../src/flow/FlowProvider';
import { NAV } from '../src/flow/paths';
import { useTheme } from '../src/theme/useTheme';

const ROOMS = [1, 2, 3, 4, 5];
const ENERGY = ['A', 'B', 'C', 'D', 'E', 'F', 'G'];
const TYPES = ['Appartamento', 'Casa indipendente', 'Villa', 'Attico'];

/** Frame 21. Applies filters and returns to search. */
export default function FiltersScreen() {
  const theme = useTheme();
  const router = useRouter();
  const flow = useFlow();
  const initial = flow.state.discovery;
  const [dealType, setDealType] = useState(initial.dealType);
  const [priceMax, setPriceMax] = useState(initial.priceMaxEur ? String(initial.priceMaxEur) : '');
  const [minRooms, setMinRooms] = useState<number | null>(initial.minRooms);
  const [energy, setEnergy] = useState<string[]>(initial.energy);
  const [seller, setSeller] = useState(initial.seller);

  const apply = () => {
    const parsed = Number(priceMax.replace(/\D/g, ''));
    flow.setDiscovery({
      dealType,
      priceMaxEur: priceMax.trim() && Number.isFinite(parsed) ? parsed : null,
      minRooms,
      energy,
      seller,
    });
    router.replace(NAV.search);
  };

  const reset = () => {
    setDealType('sale');
    setPriceMax('');
    setMinRooms(null);
    setEnergy([]);
    setSeller('all');
  };

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
      <BackHeader title="Filtri" onBack={() => router.replace(NAV.search)} />
      <ScreenScroll
        footer={<PriButton label="Mostra gli annunci" onPress={apply} />}
      >
        <View style={{ padding: 20, gap: 18 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <Text style={{ fontFamily: theme.font.display, fontSize: 22, color: theme.colors.text }}>
              {initial.text || 'Brescia'}
            </Text>
            <Text onPress={reset} style={{ fontFamily: theme.font.displaySemi, color: theme.colors.primary }}>
              Azzera
            </Text>
          </View>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            {(['sale', 'rent'] as const).map((deal) => (
              <Pressable
                key={deal}
                onPress={() => setDealType(deal)}
                style={{
                  paddingHorizontal: 14,
                  height: 36,
                  borderRadius: 18,
                  justifyContent: 'center',
                  backgroundColor: dealType === deal ? theme.colors.ink : 'transparent',
                  borderWidth: 1,
                  borderColor: theme.colors.ink,
                }}
              >
                <Text style={{ color: dealType === deal ? theme.colors.inkText : theme.colors.text, fontFamily: theme.font.displayMed }}>
                  {deal === 'sale' ? 'Vendita' : 'Affitto'}
                </Text>
              </Pressable>
            ))}
          </View>
          <Text style={label(theme)}>Prezzo massimo</Text>
          <TextInput
            value={priceMax}
            onChangeText={setPriceMax}
            keyboardType="number-pad"
            placeholder="A €"
            placeholderTextColor={theme.colors.textMuted}
            style={input(theme)}
          />
          <Text style={label(theme)}>Locali minimi</Text>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            {ROOMS.map((n) => (
              <Pressable key={n} onPress={() => setMinRooms(n)} style={chip(theme, minRooms === n)}>
                <Text style={{ color: minRooms === n ? theme.colors.inkText : theme.colors.text }}>{n === 5 ? '5+' : n}</Text>
              </Pressable>
            ))}
          </View>
          <Text style={label(theme)}>Tipologia</Text>
          <Text style={{ fontFamily: theme.font.body, color: theme.colors.textMuted }}>{TYPES.join(' · ')}</Text>
          <Text style={label(theme)}>Classe energetica</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {ENERGY.map((cls) => {
              const on = energy.includes(cls);
              return (
                <Pressable
                  key={cls}
                  onPress={() => setEnergy(on ? energy.filter((e) => e !== cls) : [...energy, cls])}
                  style={chip(theme, on)}
                >
                  <Text style={{ color: on ? theme.colors.inkText : theme.colors.text }}>{cls}</Text>
                </Pressable>
              );
            })}
          </View>
          <Text style={label(theme)}>Venditore</Text>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            {([
              ['all', 'Tutti'],
              ['private', 'Privato'],
              ['agency', 'Agenzia'],
            ] as const).map(([id, name]) => (
              <Pressable key={id} onPress={() => setSeller(id)} style={chip(theme, seller === id)}>
                <Text style={{ color: seller === id ? theme.colors.inkText : theme.colors.text }}>{name}</Text>
              </Pressable>
            ))}
          </View>
        </View>
      </ScreenScroll>
    </View>
  );
}

function label(theme: ReturnType<typeof useTheme>) {
  return { fontFamily: theme.font.mono, fontSize: 11, letterSpacing: 0.8, color: theme.colors.textMuted };
}

function input(theme: ReturnType<typeof useTheme>) {
  return {
    height: 52,
    borderWidth: 1,
    borderColor: 'rgba(20,33,46,0.30)',
    borderRadius: 14,
    paddingHorizontal: 14,
    backgroundColor: theme.colors.cream,
    fontFamily: theme.font.displayMed,
    fontSize: 16,
    color: theme.colors.text,
  };
}

function chip(theme: ReturnType<typeof useTheme>, on: boolean) {
  return {
    minWidth: 44,
    height: 36,
    paddingHorizontal: 12,
    borderRadius: 18,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    backgroundColor: on ? theme.colors.ink : 'transparent',
    borderWidth: 1,
    borderColor: on ? theme.colors.ink : 'rgba(20,33,46,0.30)',
  };
}
