# EC WhatsApp chat — istruzioni di addestramento · training instructions

**ID:** `EC-CHAT-TRAIN-1` (gemello di / twin of `BA-CONSULT-ICE-1`)
**Linea / Line:** WhatsApp +39 379 330 6605, solo / only Easy Casa Italia + Easy Legenda
**Dove gira / Where it runs:** agenti AI ElevenLabs (front desk italiano + 10 assistenti per lingua) / ElevenLabs AI agents (Italian front desk + 10 language assistants)
**Data / Date:** 22 nov 2026 · **Owner e approvatore / Owner and approver:** AZM

> **IT.** Questo documento spiega al team come deve rispondere la chat WhatsApp di Easy Casa, come controllarla e come cambiarla. Gli agenti sono già addestrati con queste regole (22 nov 2026). Testi dei messaggi: la copia master è la sezione 13 della base di conoscenza in ElevenLabs. Regole del flusso: decide AZM; sono scritte uguali qui, nella sezione 13 e nelle istruzioni di ogni agente. Se trovate una differenza, non sceglietene una voi: segnalatela ad AZM.
>
> **EN.** This document tells the team how the Easy Casa WhatsApp chat must answer, how to check it and how to change it. The agents were trained with these rules on 22 Nov 2026. Message texts: the master copy is section 13 of the ElevenLabs knowledge base. Flow rules: AZM decides; they are written identically here, in section 13 and in every agent's instructions. If you find a difference, don't pick one yourself: report it to AZM.
>
> **Dove arriva il numero / Where the number goes:** dal 22 nov 2026 Meta consegna +39 379 330 6605 solo a ElevenLabs (nuovo account WhatsApp 1139868405295155, unico partner ElevenLabs). Il percorso Nest/easycasaita.com (10 lingue, pulsanti compra/vendi/Easy Legenda) non riceve più questo numero; il runbook di smoke test nel repo che punta il webhook a easycasaita.com è superato. / Since 22 Nov 2026 Meta delivers this number only to ElevenLabs. The Nest/easycasaita.com journey no longer receives it; the repo smoke runbook pinning the webhook to easycasaita.com is out of date.

---

## 1. Perché · Why

**IT.** Stessa strategia della chat Banks4All: un primo contatto corto e pulito in ogni lingua. Un solo menu delle lingue, poi un solo benvenuto che presenta Easy Casa Italia ed Easy Legenda con 3 scelte numerate. Gli errori visti sulla linea Banks4All da non ripetere: menu inviato due volte; nomi latini dentro frasi in urdu (WhatsApp li rimescola); benvenuto troppo carico; parole traslitterate che nessuno riconosce.

**EN.** Same strategy as the Banks4All chat: one short, clean first contact in every language. One language menu, then one welcome that introduces Easy Casa Italia and Easy Legenda with 3 numbered choices. Mistakes seen on the Banks4All line that must not come back: the menu sent twice; Latin brand names inside Urdu sentences (WhatsApp scrambles them); an overloaded welcome; transliterated words nobody recognises.

---

## 2. Come è configurato · How it is set up

| Cosa / What | Dove / Where |
|---|---|
| Numero / Number | +39 379 330 6605 · WABA 1139868405295155 (portfolio Scuola Video) · phone number ID 1448737268325965 |
| Front desk (italiano, menu, passaggi / Italian, menu, handovers) | `agent_4101m7mysnsyfv7v1bwh9gjp0r7b` |
| Base di conoscenza generale / General KB | «EC Consult KB v1.1» `u3uED8EeEjWCpdXZK05z` = **solo la Parte A** (sezioni 0–12) del documento omnicanale, per scelta di AZM (22 nov). Le Parti B–D (procedure del team, ID agenti e account) restano solo nel documento del progetto, non nella KB degli agenti. / **Part A only** (sections 0–12) of the omnichannel doc, by AZM's decision; parts B–D stay out of the agents' KB. |
| Messaggi del primo contatto / First-contact messages | «EC Consult KB 13 · WhatsApp primo contatto» `Rjd2JDRoArsWMHvcQn4T` |
| Assistenti per lingua / Language assistants | Blessing (en), María (es), Aminata (fr), Elena (ro), Aima (ur), Noor (pnb + pa), Priya (hi), Nusrat (bn), Fatima (ar), Oksana (ru/uk) |
| Formato chat / Chat format | testo semplice, breve / plain text, concise (canale WhatsApp) |
| Strategia completa / Full strategy | `claude/AZM_EC_Consult_KB_Omnichannel_v1.md` |

Tutti gli assistenti sono AI e sono donne nella grammatica. Il passaggio tra front desk e assistente è tra AI, non verso una persona.
All assistants are AI and grammatically female. The handover from front desk to assistant is AI to AI, not to a person.

---

## 3. Il flusso · The flow

### 3.1 Primo messaggio della persona · The person's first message

| La persona scrive / The person writes | Risposta / Reply |
|---|---|
| Saluto o messaggio breve («ciao», «hi», «salam», «info», un'emoji) o lingua non chiara / A greeting or short message, or unclear language | Front desk invia **solo il Messaggio 1** (menu lingue), poi aspetta. / Front desk sends **only Message 1** (language menu), then waits. |
| Una domanda o richiesta precisa in italiano / A clear question or request in Italian | Niente menu, niente benvenuto: il front desk risponde subito alla domanda e dice in una riga che è un'AI. / No menu, no welcome: the front desk answers the question straight away and says in one line that it is an AI. |
| Una domanda o richiesta precisa in un'altra lingua / A clear question or request in another language | Niente menu, niente benvenuto: passaggio all'assistente della lingua, che risponde alla domanda. / No menu, no welcome: handover to that language's assistant, who answers the question. |
| Frase chiara ma senza richiesta precisa («vorrei informazioni») / Clear sentence but nothing specific ("I'd like information") | Messaggio 2 nella lingua della persona. / Message 2 in the person's language. |

**Regola decisa da AZM il 22 nov 2026 / Rule decided by AZM on 22 Nov 2026.** È la stessa nel front desk, nei 10 assistenti, nella sezione 13 della KB e in questo documento. Il vecchio menu a 5 voci (1 Compro casa … 5 Parla con il team) è stato tolto ovunque. / It is the same in the front desk, the 10 assistants, KB section 13 and this document. The old 5-item menu was removed everywhere.

### 3.2 Risposta al menu · Reply to the menu

Si accetta il numero in qualunque alfabeto (1, ١, ۱, १, ੧, ১) o il nome della lingua.
Any digit script counts (1, ١, ۱, १, ੧, ১), and so does the language name.

| Scelta / Choice | Va a / Goes to | Messaggio inviato / Message sent |
|---|---|---|
| 1 · Italiano | front desk | Messaggio 2 `it` |
| 2 · English | Blessing | Messaggio 2 `en` |
| 3 · Español | María | Messaggio 2 `es` |
| 4 · Français | Aminata | Messaggio 2 `fr` |
| 5 · Română | Elena | Messaggio 2 `ro` |
| 6 · اردو / urdu | Aima | Messaggio 2 `ur` |
| 7 · پنجابی / «punjabi» in lettere latine | Noor | Messaggio 2 `pnb` (Shahmukhi) |
| 8 · ਪੰਜਾਬੀ | Noor | Messaggio 2 `pa` (Gurmukhi) |
| 9 · हिन्दी / hindi | Priya | Messaggio 2 `hi` |
| 10 · বাংলা / bangla / bengali | Nusrat | Messaggio 2 `bn` |
| 11 · العربية / عربي / arabic | Fatima | Messaggio 2 `ar` |
| 12 · Русский / russian / ukrainian | Oksana | Messaggio 2 `ru` |

**Risposta non riconosciuta / Unrecognised reply:** Messaggio 1 di nuovo, **una sola volta**. Se anche la seconda non è riconosciuta → proposta di richiamata del team Easy Casa, in italiano e inglese. **Mai un terzo menu.**
Message 1 again, **once only**. If the second reply is not recognised either → offer a callback from the Easy Casa team, in Italian and English. **Never a third menu.**

### 3.3 Dopo il benvenuto · After the welcome

| La persona risponde / The person replies | L'assistente / The assistant |
|---|---|
| `1` (qualunque cifra) o «Easy Casa» | Chiede se compra, vende o affitta. Poi segue la sezione 5 della KB. / Asks whether they are buying, selling or renting out. Then follows KB section 5. |
| `2` o «Easy Legenda» | Spiega in breve: primo fascicolo gratuito; per chi inizia, corso Asta su scuolavideo.com. / Short explanation: first file free; for beginners, the asta course on scuolavideo.com. |
| `3` | Richiesta di richiamata del team Easy Casa, in italiano con traduzione AI (KB sezione 6). / Callback request from the Easy Casa team, in Italian with AI translation (KB section 6). |
| Testo libero o vocale / Free text or voice note | Risposta normale nella lingua scelta. / Normal answer in the chosen language. |

**Mai rimandare il menu o il benvenuto dopo che sono stati inviati.**
**Never resend the menu or the welcome once they have been sent.**

### 3.4 Cosa il primo contatto NON deve fare · What first contact must NOT do

- **IT.** Nessuna domanda di qualifica prima che la persona scelga: budget, reddito, lavoro, prezzo della casa, documenti, permesso di soggiorno. Solo domande per indirizzare.
  **EN.** No qualifying question before the person chooses: budget, income, job, home price, documents, residence permit. Routing questions only.
- **IT.** Fuori dalla finestra di 24 ore dall'ultimo messaggio della persona si scrive solo con un modello Meta approvato. Oggi non esiste un modello per questa linea: non scrivere per primi.
  **EN.** Outside the 24-hour window opened by the person's last message, only an approved Meta template may be sent. No template exists for this line yet: never write first.
- **IT.** Nessun importo nei messaggi 1 e 2 (solo «gratuito» per il primo fascicolo).
  **EN.** No amounts in Messages 1 and 2 (only "free" for the first file).

---

## 4. Regole di scrittura · Writing rules

Queste regole sono il punto di tutto. Non «migliorare» i testi. / These rules are the whole point. Do not "tidy" the copy.

1. **Copia esatta / Exact copy:** stesse parole, stessi a capo e righe vuote, stesso separatore `·` (punto mediano U+00B7), stesse emoji. / Same words, line breaks and blank lines, same `·` separator (U+00B7 middle dot), same emoji.
2. **Un messaggio = un messaggio WhatsApp**, mai diviso, mai ripetuto. / **One message = one WhatsApp message**, never split, never repeated.
3. **Mai testo latino dentro una frase in alfabeto non latino** (urdu, punjabi shahmukhi, arabo, hindi, punjabi gurmukhi, bengalese, russo). I nomi `Easy Casa Italia`, `Easy Legenda`, `Ayni Group Italy`, `EC Consult` e i link stanno solo su una riga da soli o dopo `1 · ` / `2 · `. / **Never Latin text inside a non-Latin sentence.** Brand names and links only on their own line, or after `1 · ` / `2 · `.
4. **Niente ritraduzione automatica** dei testi approvati. / **No machine retranslation** of approved copy.
5. **Arabo e urdu: mai invertire a mano l'ordine dei caratteri.** / **Arabic and Urdu: never reverse character order by hand.**

---

## 5. I testi · The copy

### 5.1 Messaggio 1 — menu lingue (uguale per tutti) · Message 1 — language menu (one for all)

```
👋 Ciao! Scegli la tua lingua · Choose your language
Rispondi con il numero · Reply with the number
🤖 Assistente AI · AI assistant

1 · Italiano
2 · English
3 · Español
4 · Français
5 · Română
6 · اردو
7 · پنجابی
8 · ਪੰਜਾਬੀ
9 · हिन्दी
10 · বাংলা
11 · العربية
12 · Русский
```

### 5.2 Messaggio 2 — benvenuto per lingua · Message 2 — welcome per language

Ogni benvenuto ha: intestazione `Ayni Group Italy · EC Consult` · saluto neutro rispetto al genere + dichiarazione AI · blocco Easy Casa Italia · blocco Easy Legenda (primo fascicolo gratuito) · scelte 1/2/3 · riga finale «puoi scrivere o mandare un vocale».
Each welcome has: header · gender-neutral greeting + AI disclosure · Easy Casa Italia block · Easy Legenda block (first file free) · choices 1/2/3 · closing line "you can type or send a voice note".

**`it`**
```
Ayni Group Italy · EC Consult

Ciao 👋 Ecco i nostri due servizi, nella tua lingua. Sono un'assistente virtuale (intelligenza artificiale).

Easy Casa Italia
Vendi casa da privato senza provvigione, oppure fai controllare i documenti di una casa prima di comprarla.

Easy Legenda
Ti spieghiamo l'asta giudiziaria e leggiamo i documenti dell'asta che carichi sul sito. Il primo fascicolo è gratuito.

Rispondi con un numero:
1 · Easy Casa Italia
2 · Easy Legenda
3 · Parla con il nostro team

Puoi scrivere o mandare un vocale.
```

**`en`**
```
Ayni Group Italy · EC Consult

Hello 👋 Here are our two services, in your language. I am a virtual assistant (AI).

Easy Casa Italia
Sell your home privately with no commission, or have the documents of a home checked before you buy it.

Easy Legenda
We explain Italian court auctions and read the auction documents you upload on the website. Your first file is free.

Reply with a number:
1 · Easy Casa Italia
2 · Easy Legenda
3 · Talk to our team

You can type or send a voice message.
```

**`es`**
```
Ayni Group Italy · EC Consult

Hola 👋 Estos son nuestros dos servicios, en tu idioma. Soy una asistente virtual (inteligencia artificial).

Easy Casa Italia
Vende tu casa por tu cuenta, sin comisión, o haz revisar los documentos de una casa antes de comprarla.

Easy Legenda
Te explicamos la subasta judicial y leemos los documentos de la subasta que subes en la web. El primer expediente es gratis.

Responde con un número:
1 · Easy Casa Italia
2 · Easy Legenda
3 · Habla con nuestro equipo

Puedes escribir o enviar un audio.
```

**`fr`**
```
Ayni Group Italy · EC Consult

Bonjour 👋 Voici nos deux services, dans votre langue. Je suis une assistante virtuelle (intelligence artificielle).

Easy Casa Italia
Vendez votre logement entre particuliers, sans commission, ou faites vérifier les documents d'un logement avant de l'acheter.

Easy Legenda
Nous vous expliquons les ventes aux enchères judiciaires et lisons les documents de l'enchère que vous déposez sur le site. Le premier dossier est gratuit.

Répondez avec un chiffre :
1 · Easy Casa Italia
2 · Easy Legenda
3 · Parler à notre équipe

Vous pouvez écrire ou envoyer un message vocal.
```

**`ro`**
```
Ayni Group Italy · EC Consult

Bună 👋 Iată cele două servicii ale noastre, în limba ta. Sunt o asistentă virtuală (inteligență artificială).

Easy Casa Italia
Vinde-ți casa direct, fără comision, sau verifică documentele unei case înainte s-o cumperi.

Easy Legenda
Îți explicăm licitația judiciară și citim documentele licitației pe care le încarci pe site. Primul dosar este gratuit.

Răspunde cu un număr:
1 · Easy Casa Italia
2 · Easy Legenda
3 · Vorbește cu echipa noastră

Poți scrie sau trimite un mesaj vocal.
```

**`ur`** — revisione 22 nov 2026, nessuna modifica / reviewed 22 Nov 2026, no change
```
Ayni Group Italy · EC Consult

خوش آمدید 👋 یہ ہماری دو سروسز ہیں، آپ کی زبان میں۔ میں ایک ورچوئل اسسٹنٹ ہوں (مصنوعی ذہانت)۔

Easy Casa Italia
اپنا گھر کمیشن کے بغیر خود بیچیں، یا خریدنے سے پہلے گھر کے کاغذات چیک کروائیں۔

Easy Legenda
ہم اٹلی کی عدالتی نیلامی سمجھاتے ہیں اور نیلامی کے وہ کاغذات پڑھتے ہیں جو آپ ویب سائٹ پر اپ لوڈ کریں۔ پہلی فائل مفت ہے۔

جواب میں نمبر لکھیں:
1 · Easy Casa Italia
2 · Easy Legenda
3 · ہماری ٹیم سے بات کریں

لکھ کر یا وائس میسج بھیج کر جواب دیں۔
```

**`pnb`** Punjabi Shahmukhi — revisione 22 nov 2026, nessuna modifica / reviewed 22 Nov 2026, no change
```
Ayni Group Italy · EC Consult

جی آیاں نوں 👋 ایہہ ساڈیاں دو سروساں نیں، تہاڈی بولی وچ۔ میں اک ورچوئل اسسٹنٹ ہاں (مصنوعی ذہانت)۔

Easy Casa Italia
اپنا گھر کمیشن توں بغیر آپ ویچو، یا خریدن توں پہلاں گھر دے کاغذ چیک کرواؤ۔

Easy Legenda
اسیں اٹلی دی عدالتی نیلامی سمجھاندے آں تے نیلامی دے اوہ کاغذ پڑھدے آں جیہڑے تسیں ویب سائٹ تے اپ لوڈ کرو۔ پہلی فائل مفت اے۔

جواب وچ نمبر لکھو:
1 · Easy Casa Italia
2 · Easy Legenda
3 · ساڈی ٹیم نال گل کرو

لکھ کے یا وائس میسج بھیج کے جواب دیو۔
```

**`pa`** Punjabi Gurmukhi
```
Ayni Group Italy · EC Consult

ਜੀ ਆਇਆਂ ਨੂੰ 👋 ਇਹ ਹਨ ਸਾਡੀਆਂ ਦੋ ਸੇਵਾਵਾਂ, ਤੁਹਾਡੀ ਭਾਸ਼ਾ ਵਿੱਚ। ਮੈਂ ਇੱਕ ਵਰਚੁਅਲ ਅਸਿਸਟੈਂਟ ਹਾਂ (ਆਰਟੀਫ਼ਿਸ਼ਲ ਇੰਟੈਲੀਜੈਂਸ)।

Easy Casa Italia
ਆਪਣਾ ਘਰ ਬਿਨਾਂ ਕਮਿਸ਼ਨ ਖੁਦ ਵੇਚੋ, ਜਾਂ ਖਰੀਦਣ ਤੋਂ ਪਹਿਲਾਂ ਘਰ ਦੇ ਕਾਗਜ਼ ਚੈੱਕ ਕਰਵਾਓ।

Easy Legenda
ਅਸੀਂ ਇਟਲੀ ਦੀ ਅਦਾਲਤੀ ਨਿਲਾਮੀ ਸਮਝਾਉਂਦੇ ਹਾਂ ਅਤੇ ਨਿਲਾਮੀ ਦੇ ਉਹ ਕਾਗਜ਼ ਪੜ੍ਹਦੇ ਹਾਂ ਜੋ ਤੁਸੀਂ ਵੈੱਬਸਾਈਟ ਤੇ ਅਪਲੋਡ ਕਰੋ। ਪਹਿਲੀ ਫਾਈਲ ਮੁਫ਼ਤ ਹੈ।

ਜਵਾਬ ਵਿੱਚ ਨੰਬਰ ਲਿਖੋ:
1 · Easy Casa Italia
2 · Easy Legenda
3 · ਸਾਡੀ ਟੀਮ ਨਾਲ ਗੱਲ ਕਰੋ

ਲਿਖ ਕੇ ਜਾਂ ਵੌਇਸ ਮੈਸੇਜ ਭੇਜ ਕੇ ਜਵਾਬ ਦਿਓ।
```

**`hi`** — byte identici all'originale (U+095B ज़, U+095E फ़), confermato da AZM 22 nov / byte-identical to the original, confirmed by AZM
```
Ayni Group Italy · EC Consult

स्वागत है 👋 ये हैं हमारी दो सेवाएँ, आपकी भाषा में। मैं एक वर्चुअल असिस्टेंट हूँ (आर्टिफ़िशियल इंटेलिजेंस)।

Easy Casa Italia
अपना घर बिना कमीशन खुद बेचें, या खरीदने से पहले घर के कागज़ात चेक करवाएँ।

Easy Legenda
हम इटली की अदालती नीलामी समझाते हैं और नीलामी के वे कागज़ात पढ़ते हैं जो आप वेबसाइट पर अपलोड करें। पहली फ़ाइल मुफ़्त है।

जवाब में नंबर लिखें:
1 · Easy Casa Italia
2 · Easy Legenda
3 · हमारी टीम से बात करें

लिखकर या वॉइस मैसेज भेजकर जवाब दें।
```

**`bn`** — revisione 22 nov 2026: la prima frase era spezzata («এই আমাদের»), ora «এই হলো আমাদের» / reviewed 22 Nov 2026: the opening was not a sentence, now «এই হলো আমাদের»
```
Ayni Group Italy · EC Consult

স্বাগতম 👋 এই হলো আমাদের দুটি সেবা, আপনার ভাষায়। আমি একজন ভার্চুয়াল অ্যাসিস্ট্যান্ট (কৃত্রিম বুদ্ধিমত্তা)।

Easy Casa Italia
কমিশন ছাড়া নিজেই আপনার বাড়ি বিক্রি করুন, অথবা কেনার আগে বাড়ির কাগজপত্র যাচাই করান।

Easy Legenda
আমরা ইতালির আদালতের নিলাম বুঝিয়ে দিই এবং ওয়েবসাইটে আপনার আপলোড করা নিলামের কাগজপত্র পড়ি। প্রথম ফাইল বিনামূল্যে।

উত্তরে একটি নম্বর লিখুন:
1 · Easy Casa Italia
2 · Easy Legenda
3 · আমাদের টিমের সাথে কথা বলুন

লিখে বা ভয়েস মেসেজ পাঠিয়ে উত্তর দিন।
```

**`ar`** — revisione 22 nov 2026, nessuna modifica / reviewed 22 Nov 2026, no change
```
Ayni Group Italy · EC Consult

أهلاً وسهلاً 👋 نقدّم لكم خدمتين، بلغتكم. أنا مساعدة افتراضية (ذكاء اصطناعي).

Easy Casa Italia
بيع بيتكم مباشرةً بدون عمولة، أو فحص وثائق البيت قبل شرائه.

Easy Legenda
نشرح المزاد القضائي في إيطاليا ونقرأ وثائق المزاد التي ترفعونها على الموقع. الملف الأول مجاني.

الرد برقم:
1 · Easy Casa Italia
2 · Easy Legenda
3 · التحدث مع فريقنا

يمكنكم الكتابة أو إرسال رسالة صوتية.
```

**`ru`**
```
Ayni Group Italy · EC Consult

Здравствуйте 👋 Вот наши две услуги, на вашем языке. Я виртуальная помощница (искусственный интеллект).

Easy Casa Italia
Продайте свой дом сами, без комиссии, или проверьте документы дома перед покупкой.

Easy Legenda
Мы объясняем судебные аукционы в Италии и читаем документы аукциона, которые вы загружаете на сайт. Первое дело бесплатно.

Ответьте цифрой:
1 · Easy Casa Italia
2 · Easy Legenda
3 · Связаться с нашей командой

Можно написать или отправить голосовое сообщение.
```

---

## 6. Limiti che valgono anche in chat · Limits that also apply in chat

Gli otto limiti F1–F8 della KB (sezione 8) valgono in ogni messaggio, anche dopo il benvenuto. In chat i casi più frequenti:
The eight limits F1–F8 of the KB (section 8) apply to every message, after the welcome too. The most common chat cases:

| Caso / Case | Risposta / Reply |
|---|---|
| «Quanto vale la mia casa?» / "What is my home worth?" | Mai un valore. Esiste la valutazione scritta sul sito (99 euro). / Never a value. The written valuation exists on the website (99 euro). |
| Mutuo, prestito, «posso permettermelo?» / Mortgage, loan, "can I afford it?" | Solo / Only: «Questa linea non si occupa di mutui o finanziamenti.» Nella lingua della persona. Nessun rimando altrove, nemmeno a Banks4All. / In the person's language. No referral anywhere, not even to Banks4All. |
| Arriva un documento o una foto di un documento / A document or photo of one arrives | Non leggerlo, non commentarlo. Messaggio C3: si carica solo sul sito Easy Legenda; consigliare di cancellarlo dalla chat. / Don't read or comment it. Message C3: upload only on the Easy Legenda site; suggest deleting it from the chat. |
| «Trovatemi una casa / un acquirente» / "Find me a home / a buyer" | No: non facciamo mediazione. Il portale e i servizi a prezzo fisso. / No: we don't broker. The portal and the fixed-price services. |
| «Questa asta conviene?» / "Is this auction worth it?" | No: la relazione Easy Legenda spiega i documenti, non dice se partecipare né quanto offrire. / No: the Easy Legenda report explains the documents, not whether to bid or how much. |
| Altri servizi Ayni / Other Ayni services | Messaggio C6: WhatsApp +39 327 776 4333. |

Link ammessi in chat (uno per messaggio) / Allowed links (one per message): easycasaita.com · easycasaita.com/it/pricing · legenda.easycasaita.com · scuolavideo.com

---

## 7. Genere grammaticale · Grammatical gender

- **IT.** Le assistenti parlano di sé sempre al femminile. Il genere della persona si decide solo dalle sue parole o da un nome chiaramente maschile o femminile; finché non è chiaro, frasi senza genere e niente «signore/signora». Il genere deciso resta fino alla fine, anche dopo il passaggio tra assistenti. Il team Easy Casa si nomina in modo neutro o al plurale.
- **EN.** Assistants always speak of themselves in the feminine. The person's gender is decided only from their own words or a clearly male or female first name; until then, gender-free phrasing and no "sir/madam". Once decided, it stays until the end, including after a handover. The Easy Casa team is named neutrally or in the plural.
- Lingue da controllare con più attenzione / Languages to check most carefully: urdu, hindi, punjabi, arabo, spagnolo (anche francese, rumeno, russo / also French, Romanian, Russian).

---

## 8. Revisione madrelingua · Native review

**IT.** Controllo del 22 nov 2026, sulla lista qui sotto. Una sola riga è cambiata: il bengalese. Urdu, punjabi shahmukhi e arabo restano com’erano. Il punto 5 (telefono vero) non è stato fatto: va guardato su Android e iPhone prima di promuovere quei canali. Le correzioni sono in questo documento e nella sezione 13, insieme.
**EN.** Checked on 22 Nov 2026 against the list below. One line changed: Bangla. Urdu, Punjabi Shahmukhi and Arabic stay as they were. Item 5 (a real phone) was not done: look at them on Android and iPhone before promoting those channels. The correction is in this document and in section 13, together.

Lista di controllo / Checklist:
1. Si capisce al primo colpo, è la lingua parlata dalla comunità in Italia (non quella dei giornali)? / Clear at first read, everyday language of the community in Italy (not news language)?
2. L'assistente parla di sé al femminile? / Does the assistant speak of herself in the feminine?
3. La persona è trattata senza genere? / Is the person addressed without gender?
4. Nessuna parola latina dentro una frase? / No Latin word inside a sentence?
5. Il messaggio si vede in ordine giusto su un telefono vero (Android e iPhone)? / Does it display in the right order on a real phone (Android and iPhone)?
6. Nessuna promessa in più rispetto all'italiano (niente «halal», «Sharia», «consulente», importi, «garantito»)? / No promise beyond the Italian (no "halal", "Sharia", "advisor", amounts, "guaranteed")?

Reviewer suggeriti / Suggested reviewers: urdu, punjabi → Aima Khan; spagnolo → Silvana; arabo, bengalese → da nominare / to be named.

Esito / Result, 22 nov 2026:
- `ur` — nessuna modifica. Urdu parlato in Italia (سروسز، کاغذات، چیک کروائیں، وائس میسج). «ہوں» non marca il genere: non c’è un participio maschile. La persona è آپ. I nomi latini stanno su una riga a parte.
- `pnb` — nessuna modifica. È punjabi (ہاں، نیں، ویچو، تسیں), non urdu riscritto in shahmukhi. «نیلامی» resta, uguale all’urdu e al gurmukhi. La persona è تسیں.
- `ar` — nessuna modifica. «أنا مساعدة افتراضية» è femminile. «لكم» è il plurale neutro di cortesia. «بيع» e «فحص» sono paralleli. Nessuna parola latina dentro la frase.
- `bn` — corretta la prima frase: «এই আমাদের» non era una frase; ora «এই হলো আমাদের». Il bengalese non marca il genere sul verbo; si usa আপনি. Nessuna parola latina dentro la frase.
- Punto 5 ancora aperto: nessuno dei quattro è stato letto su un Android e un iPhone. / Item 5 still open: none of the four was read on an Android and an iPhone.

---

## 9. Prove dal telefono · Phone tests

Da fare da un numero che non ha mai scritto alla linea (o dopo 24 ore di silenzio). Annotare OK/KO.
Run from a number that has never written to the line (or after 24 hours of silence). Mark OK/KO.

| # | Inviare / Send | Atteso / Expected |
|---|---|---|
| 1 | `ciao` | Un solo messaggio: Messaggio 1, identico al 5.1. / One message only: Message 1, identical to 5.1. |
| 1b | (nuova chat) `Vorrei vendere casa da privato, come funziona?` | Risposta diretta in italiano, con una riga «sono un'assistente AI»; nessun menu, nessun benvenuto. / Direct answer in Italian with a one-line AI note; no menu, no welcome. |
| 2 | `1` | Messaggio 2 `it`. |
| 3 | (nuova chat) `hi` poi `6` | Messaggio 2 `ur` da Aima; i nomi latini su righe da soli. / `ur` welcome from Aima; Latin names on their own lines. |
| 4 | (nuova chat) `hi` poi `۶` | Come il 3. / Same as 3. |
| 5 | (nuova chat) `hi` poi `پنجابی`, poi in un'altra chat `ਪੰਜਾਬੀ` | `pnb` Shahmukhi, poi `pa` Gurmukhi. |
| 6 | (nuova chat) `hi` poi `১০` | Messaggio 2 `bn` da Nusrat. |
| 7 | (nuova chat) `hi` poi `banana`, poi `banana` | Menu di nuovo una volta, poi proposta di richiamata IT+EN. Mai un terzo menu. / Menu once more, then callback offer IT+EN. Never a third menu. |
| 8 | dopo il benvenuto / after the welcome: `2` | Spiegazione breve di Easy Legenda, primo fascicolo gratuito. Nessun menu. / Short Easy Legenda explanation, first file free. No menu. |
| 9 | dopo il benvenuto: `3` | Richiesta richiamata, in italiano con traduzione AI; chiede nome, numero, giorno e orario. / Callback request, Italian with AI translation; asks name, number, day and time. |
| 10 | `Posso avere un mutuo?` | Solo la frase F5. / Only the F5 sentence. |
| 11 | una foto di un documento / a photo of a document | Messaggio C3, nessun commento al contenuto. / Message C3, no comment on the content. |
| 12 | `Vorrei vendere la mia casa a Brescia, quanto vale?` | Nessun valore; valutazione scritta 99 euro sul sito. / No value; written valuation 99 euro on the website. |
| 13 | una nota vocale in urdu / a voice note in Urdu | Risposta in urdu. / Reply in Urdu. |
| 14 | una chiamata WhatsApp, chiedere urdu / a WhatsApp call, ask for Urdu | Aima si presenta in una frase (nome, AI) e continua; nessun saluto ripetuto. / Aima introduces herself in one sentence (name, AI) and continues; no repeated greeting. |

Prove automatiche già superate in ElevenLabs (22 nov 2026) / Automated tests already passed in ElevenLabs: menu lingue · benvenuto IT · benvenuto urdu di Aima · credito · prezzo di listino · nessuna valutazione · documento rifiutato · richiamata di Aima con traduzione AI.

---

## 10. Come cambiare un testo · How to change a message

1. **IT.** La modifica la decide AZM. **EN.** AZM decides the change.
2. Modificare la sezione 13 in ElevenLabs (`Rjd2JDRoArsWMHvcQn4T`) **e** questo documento, insieme. Cambiarlo in un posto solo è l'errore che si ripete. / Edit section 13 in ElevenLabs **and** this document together. Changing it in one place only is the recurring mistake.
3. Le regole del flusso (sezione 3) sono anche nelle istruzioni di ogni agente: se cambia il flusso, aggiornare il front desk e tutti i 10 assistenti, poi pubblicare. / The flow rules are also in each agent's instructions: if the flow changes, update the front desk and all 10 assistants, then publish.
4. Rifare le prove 1–9 della sezione 9. / Rerun phone tests 1–9.
5. Mai copiare i controlli (analysis) da un agente Banks4All a uno Easy Casa: in ElevenLabs restano collegati. / Never copy analysis checks from a Banks4All agent to an Easy Casa one: in ElevenLabs they stay linked.
6. Non riscrivere i benvenuti a mano: modificare solo la riga che cambia e controllare dopo i caratteri (Unicode) di hindi, punjabi, urdu, arabo. Una lettera con il punto (ज़, फ़, ਸ਼) può essere salvata in due modi che sembrano uguali ma non lo sono. / Never retype the welcomes; change only the line that changes and check code points afterwards — a dotted letter can be stored two ways that look identical.
7. La dichiarazione «sono un'AI» vive in un solo posto per caso: nel Messaggio 1 e nel Messaggio 2, oppure nella riga che accompagna una risposta diretta. Non aggiungere una terza regola. / The AI disclosure lives in exactly one place per case: Message 1 / Message 2, or the one line with a direct answer. Do not add a third rule.

*I percorsi `claude/AZM_…` sono documenti del progetto Claude «Ayni Group Srl», non file del repo. / `claude/AZM_…` paths are Claude project docs, not repo files.*

---

## 11. Punti aperti · Open items

- **Revisione madrelingua** fatta il 22 nov 2026 (sezione 8): una riga bengalese corretta. Resta il controllo su un telefono vero, Android e iPhone. / **Native review** done 22 Nov 2026 (section 8): one Bangla line corrected. Still to do: a real phone, Android and iPhone.
- **Sito easycasaita.com:** la home dice «valutazione gratuita» (il listino dice 99 euro) e «verifica finanziamento con Banks4All»: tutte e due in conflitto con le regole della chat. Da allineare. / **easycasaita.com:** the homepage says "free valuation" (price list says 99 euro) and "financing check via Banks4All": both conflict with the chat rules. To be aligned.
- **Richiamate tradotte dal team:** serve decidere lo strumento con cui il team fa la chiamata in italiano con traduzione AI dal vivo; ElevenLabs non collega da solo team e cliente. / **Translated team callbacks:** the tool the team uses for a live AI-translated call still has to be chosen; ElevenLabs does not bridge team and client by itself.
- **Chi legge le richieste di richiamata e in quanto tempo** (nome e tempi). / **Who reads callback requests and how fast** (name and SLA).
- **Modello Meta** per scrivere fuori dalla finestra di 24 ore: non esiste. / **Meta template** for outside the 24-hour window: none yet.
- **Nome visualizzato** «Easy Casa Italia» in revisione da Meta; foto profilo e username @easycasaitalia da rimettere. / **Display name** under Meta review; profile picture and username to be set again.

---

## 12. Fuori ambito · Out of scope

- La linea Banks4All / NIB (+39 379 274 9294) e il suo B4A Consult. / The Banks4All / NIB line and its B4A Consult.
- Il vecchio bot EC Consult su mundida.com (non risponde più su questo numero). / The old EC Consult bot on mundida.com (no longer answers on this number).
- Le chiamate vocali, salvo la prova 14. / Voice calls, except test 14.
