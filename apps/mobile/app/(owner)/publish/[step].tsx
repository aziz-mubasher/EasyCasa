import React from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';

import { BackHeader, PriButton, ScreenScroll } from '../../../src/components/shell/ui';
import { useFlow } from '../../../src/flow/FlowProvider';
import { NAV, publishPath } from '../../../src/flow/paths';
import { publishBlocker } from '../../../src/flow/machine';
import { useTheme } from '../../../src/theme/useTheme';

const ORDER = ['basics', 'address', 'details', 'price', 'photos', 'description', 'review'] as const;
type Step = (typeof ORDER)[number];

const TYPES: { id: string; label: string }[] = [
  { id: 'apartment', label: 'Appartamento' },
  { id: 'house', label: 'Casa' },
  { id: 'villa', label: 'Villa' },
  { id: 'land', label: 'Terreno' },
  { id: 'commercial', label: 'Commerciale' },
  { id: 'garage', label: 'Box / garage' },
  { id: 'other', label: 'Altro' },
];

const ENERGY = ['A', 'B', 'C', 'D', 'E', 'F', 'G'];

function asStep(value: string | undefined): Step {
  return (ORDER as readonly string[]).includes(value ?? '') ? (value as Step) : 'basics';
}

/** Frames 25, 11, 26, 27 plus the address, price and description steps of WIZARD_STEPS. */
export default function PublishStepScreen() {
  const theme = useTheme();
  const router = useRouter();
  const flow = useFlow();
  const { step: raw } = useLocalSearchParams<{ step: string }>();
  const step = asStep(raw);
  const index = ORDER.indexOf(step);
  const draft = flow.state.publish;
  const blocker = publishBlocker(draft);

  const go = (next: Step) => router.push(publishPath(next));
  const exit = () => router.replace(NAV.seller);

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
      <BackHeader title={`Pubblica ${index + 1}/7`} onBack={() => (index === 0 ? exit() : router.back())} />
      <ScreenScroll
        footer={
          <View style={{ gap: 8 }}>
            {step === 'review' ? (
              <>
                <Pressable
                  onPress={() => flow.setPublish({ terms: !draft.terms })}
                  style={{ flexDirection: 'row', gap: 10, alignItems: 'center' }}
                >
                  <View
                    style={{
                      width: 22,
                      height: 22,
                      borderRadius: 6,
                      borderWidth: 1.5,
                      borderColor: theme.colors.ink,
                      backgroundColor: draft.terms ? theme.colors.ink : 'transparent',
                    }}
                  />
                  <Text style={{ flex: 1, fontFamily: theme.font.body, color: theme.colors.text }}>
                    Ho letto e accetto i termini di pubblicazione.
                  </Text>
                </Pressable>
                <PriButton
                  label={blocker ?? 'Pubblica l’annuncio'}
                  disabled={blocker !== null}
                  onPress={exit}
                />
              </>
            ) : (
              <PriButton
                label="Continua"
                onPress={() => {
                  const next = ORDER[index + 1];
                  if (next) go(next);
                }}
                disabled={step === 'basics' && draft.title.trim().length === 0}
              />
            )}
            <Text
              onPress={exit}
              style={{ textAlign: 'center', color: theme.colors.primary, fontFamily: theme.font.displayMed }}
            >
              Salva e esci
            </Text>
          </View>
        }
      >
        <View style={{ padding: 20, gap: 14 }}>
          <View style={{ flexDirection: 'row', gap: 4 }}>
            {ORDER.map((id, i) => (
              <View
                key={id}
                style={{
                  flex: 1,
                  height: 4,
                  borderRadius: 2,
                  backgroundColor: i <= index ? theme.colors.primary : '#d6ccb6',
                }}
              />
            ))}
          </View>
          <Text style={{ fontFamily: theme.font.display, fontSize: 24, color: theme.colors.text }}>
            {titleFor(step)}
          </Text>
          {step === 'basics' ? (
            <>
              <Text style={{ fontFamily: theme.font.body, color: theme.colors.textMuted }}>
                Lo scrivi tu, lo pubblichi tu. I compratori scrivono a te.
              </Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                {TYPES.map((type) => (
                  <Pressable key={type.id} onPress={() => flow.setPublish({ type: type.id })} style={chip(theme, draft.type === type.id)}>
                    <Text style={{ color: draft.type === type.id ? theme.colors.inkText : theme.colors.text }}>{type.label}</Text>
                  </Pressable>
                ))}
              </View>
              <Field
                label="Titolo dell'annuncio"
                value={draft.title}
                onChangeText={(title) => flow.setPublish({ title })}
                placeholder="Trilocale con terrazzo"
              />
            </>
          ) : null}
          {step === 'address' ? (
            <Field label="Comune" value={draft.city} onChangeText={(city) => flow.setPublish({ city })} placeholder="Brescia" />
          ) : null}
          {step === 'details' ? (
            <>
              <Text style={{ fontFamily: theme.font.body, color: theme.colors.textMuted }}>
                Classe energetica e indice sono obbligatori. Senza, l’annuncio non si pubblica.
              </Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                {ENERGY.map((cls) => (
                  <Pressable key={cls} onPress={() => flow.setPublish({ energyClass: cls })} style={chip(theme, draft.energyClass === cls)}>
                    <Text style={{ color: draft.energyClass === cls ? theme.colors.inkText : theme.colors.text }}>{cls}</Text>
                  </Pressable>
                ))}
              </View>
              <Field
                label="Indice kWh/m²·anno"
                value={draft.energyIndex}
                onChangeText={(energyIndex) => flow.setPublish({ energyIndex })}
                placeholder="142"
              />
            </>
          ) : null}
          {step === 'price' ? (
            <Field label="Prezzo richiesto €" value={draft.price} onChangeText={(price) => flow.setPublish({ price })} placeholder="245000" />
          ) : null}
          {step === 'photos' ? (
            <>
              <Text style={{ fontFamily: theme.font.body, color: theme.colors.textMuted }}>
                Servono almeno 3 foto. Ora: {draft.photos}.
              </Text>
              <PriButton label="Scegli le foto" onPress={() => router.push(NAV.permPhotos)} />
            </>
          ) : null}
          {step === 'description' ? (
            <Field
              label="Descrizione"
              value={draft.description}
              onChangeText={(description) => flow.setPublish({ description })}
              placeholder="Com'è la casa, con parole tue."
              multiline
            />
          ) : null}
          {step === 'review' ? (
            <View style={{ gap: 10 }}>
              <Line ok={draft.title.trim().length > 0} title="1. Tipo e titolo" detail={draft.title || 'Manca il titolo'} />
              <Line ok={draft.city.trim().length > 0} title="2. Indirizzo" detail={draft.city} />
              <Line
                ok={draft.energyClass.length > 0 && draft.energyIndex.length > 0}
                title="3. Dettagli ed energia"
                detail={
                  draft.energyClass
                    ? `${draft.energyClass} · ${draft.energyIndex || 'manca l’indice'}`
                    : 'Mancano classe energetica e indice'
                }
                onFix={() => go('details')}
              />
              <Line ok={draft.price.trim().length > 0} title="4. Prezzo" detail={draft.price ? `€ ${draft.price}` : 'Manca il prezzo'} />
              <Line ok={draft.photos >= 3} title="5. Foto" detail={`${draft.photos} foto`} />
              <Line ok={draft.description.trim().length > 0} title="6. Descrizione" detail={`${draft.description.trim().length} caratteri`} />
              <Text onPress={() => router.push(NAV.perimeter)} style={{ color: theme.colors.primary, fontFamily: theme.font.displayMed }}>
                Cosa non facciamo
              </Text>
            </View>
          ) : null}
        </View>
      </ScreenScroll>
    </View>
  );
}

function titleFor(step: Step): string {
  switch (step) {
    case 'basics':
      return 'Passo 1 di 7 · Tipo e titolo';
    case 'address':
      return 'Passo 2 di 7 · Indirizzo';
    case 'details':
      return 'Passo 3 di 7 · Dettagli ed energia';
    case 'price':
      return 'Passo 4 di 7 · Prezzo';
    case 'photos':
      return 'Passo 5 di 7 · Foto';
    case 'description':
      return 'Passo 6 di 7 · Descrizione';
    default:
      return 'Passo 7 di 7 · Revisione';
  }
}

function Line({
  ok,
  title,
  detail,
  onFix,
}: {
  ok: boolean;
  title: string;
  detail: string;
  onFix?: () => void;
}) {
  const theme = useTheme();
  return (
    <View style={{ flexDirection: 'row', gap: 10, alignItems: 'center' }}>
      <Text style={{ color: ok ? theme.colors.pine : theme.colors.danger }}>{ok ? '✓' : '!'}</Text>
      <View style={{ flex: 1 }}>
        <Text style={{ fontFamily: theme.font.displaySemi, color: theme.colors.text }}>{title}</Text>
        <Text style={{ fontFamily: theme.font.body, color: theme.colors.textMuted }}>{detail}</Text>
      </View>
      {onFix && !ok ? (
        <Text onPress={onFix} style={{ color: theme.colors.primary, fontFamily: theme.font.displaySemi }}>
          Completa
        </Text>
      ) : null}
    </View>
  );
}

function Field({
  label,
  value,
  onChangeText,
  placeholder,
  multiline,
}: {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  placeholder: string;
  multiline?: boolean;
}) {
  const theme = useTheme();
  return (
    <View style={{ gap: 6 }}>
      <Text style={{ fontFamily: theme.font.displaySemi, color: theme.colors.text }}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={theme.colors.textMuted}
        multiline={multiline}
        style={{
          minHeight: multiline ? 120 : 52,
          borderWidth: 1,
          borderColor: 'rgba(20,33,46,0.30)',
          borderRadius: 14,
          paddingHorizontal: 14,
          paddingVertical: 12,
          backgroundColor: theme.colors.cream,
          color: theme.colors.text,
          fontFamily: theme.font.body,
          fontSize: 16,
          textAlignVertical: multiline ? 'top' : 'center',
        }}
      />
    </View>
  );
}

function chip(theme: ReturnType<typeof useTheme>, on: boolean) {
  return {
    paddingHorizontal: 12,
    height: 36,
    borderRadius: 18,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    backgroundColor: on ? theme.colors.ink : 'transparent',
    borderWidth: 1,
    borderColor: on ? theme.colors.ink : 'rgba(20,33,46,0.30)',
  };
}
