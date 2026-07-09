import React from 'react';
import {
  AbsoluteFill,
  Easing,
  Img,
  interpolate,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from 'remotion';

const c = {
  ink: '#0f172a',
  slate: '#475569',
  muted: '#94a3b8',
  line: '#dbeafe',
  panel: '#ffffff',
  wash: '#eef2ff',
  teal: '#0f766e',
  mint: '#2dd4bf',
  green: '#059669',
  blue: '#2563eb',
  red: '#f43f5e',
  amber: '#b45309',
  orange: '#ea580c',
};

const ease = Easing.bezier(0.16, 1, 0.3, 1);

const fade = (frame: number, start: number, duration: number) =>
  interpolate(frame, [start, start + duration], [0, 1], {
    easing: ease,
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

const scene = (frame: number, start: number, end: number) => {
  const inValue = fade(frame, start, 24);
  const outValue = interpolate(frame, [end - 24, end], [1, 0], {
    easing: Easing.in(Easing.cubic),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  return Math.min(inValue, outValue);
};

const rise = (progress: number, px = 36) => ({
  opacity: progress,
  transform: `translateY(${interpolate(progress, [0, 1], [px, 0])}px)`,
});

const card: React.CSSProperties = {
  background: c.panel,
  border: `1px solid ${c.line}`,
  borderRadius: 28,
  boxShadow: '0 22px 60px rgba(15, 23, 42, 0.1)',
};

const appShell: React.CSSProperties = {
  width: 1280,
  height: 720,
  borderRadius: 40,
  background: '#f8fafc',
  border: '1px solid rgba(148, 163, 184, 0.32)',
  boxShadow: '0 44px 110px rgba(15, 23, 42, 0.18)',
  overflow: 'hidden',
};

const AppChrome = ({ children, title = "Umumiy Ko'rinish" }: { children: React.ReactNode; title?: string }) => (
  <div style={appShell}>
    <div
      style={{
        height: 92,
        background: '#ffffff',
        borderBottom: '1px solid #e2e8f0',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 42px',
      }}
    >
      <div style={{ color: c.ink, fontSize: 30, fontWeight: 850 }}>{title}</div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 18 }}>
        <div style={{ width: 56, height: 56, borderRadius: 18, background: '#f1f5f9' }} />
        <div
          style={{
            height: 62,
            borderRadius: 18,
            background: c.teal,
            color: 'white',
            display: 'flex',
            alignItems: 'center',
            padding: '0 28px',
            fontSize: 24,
            fontWeight: 850,
          }}
        >
          + Yangi o'tkazma
        </div>
      </div>
    </div>
    {children}
  </div>
);

const Kicker = ({ children, color = c.teal }: { children: React.ReactNode; color?: string }) => (
  <div
    style={{
      color,
      fontSize: 22,
      fontWeight: 900,
      textTransform: 'uppercase',
      letterSpacing: 2.2,
    }}
  >
    {children}
  </div>
);

const Title = ({ children, size = 78 }: { children: React.ReactNode; size?: number }) => (
  <div style={{ color: c.ink, fontSize: size, lineHeight: 1.03, fontWeight: 950, letterSpacing: 0 }}>{children}</div>
);

const Copy = ({ children, width = 720 }: { children: React.ReactNode; width?: number }) => (
  <div style={{ color: c.slate, fontSize: 30, lineHeight: 1.34, fontWeight: 650, width }}>{children}</div>
);

const Metric = ({
  label,
  value,
  tone,
  small,
}: {
  label: string;
  value: string;
  tone: string;
  small?: string;
}) => (
  <div style={{ ...card, padding: 32, height: 178, flex: 1 }}>
    <div style={{ color: tone, fontSize: 22, fontWeight: 900, textTransform: 'uppercase', letterSpacing: 1.5 }}>{label}</div>
    <div style={{ marginTop: 28, display: 'flex', alignItems: 'baseline', gap: 12 }}>
      <div style={{ color: c.ink, fontSize: 54, fontWeight: 950, fontVariantNumeric: 'tabular-nums', lineHeight: 1 }}>
        {value}
      </div>
      <div style={{ color: '#94a3b8', fontSize: 24, fontWeight: 750 }}>{small ?? 'UZS'}</div>
    </div>
  </div>
);

const IntroScene = ({ progress }: { progress: number }) => (
  <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', ...rise(progress, 24) }}>
    <div style={{ width: 1420, display: 'grid', gridTemplateColumns: '0.92fr 1.08fr', gap: 74, alignItems: 'center' }}>
      <div>
        <Img src={staticFile('images/taksapark-logo.png')} style={{ width: 430, objectFit: 'contain', marginBottom: 70 }} />
        <Kicker>Avtopark uchun boshqaruv markazi</Kicker>
        <div style={{ height: 22 }} />
        <Title>Excel, daftar va chatlar orasida biznes yo'qolmasin.</Title>
        <div style={{ height: 28 }} />
        <Copy>
          Taksapark haydovchi, mashina, o'tkazma, depozit, reja va hujjat eslatmalarini bitta aniq tizimga yig'adi.
        </Copy>
      </div>
      <div style={{ position: 'relative', height: 700 }}>
        {[
          ['Excel jadval', 'Formula xatosi', c.red, 40, 70],
          ['Telegram yozishma', "Kim to'ladi?", c.amber, 240, 250],
          ['Daftar', 'Qarz qoldi', c.red, 70, 430],
          ['Cheklar', "Yo'qolgan rasm", c.slate, 420, 120],
        ].map(([label, text, color, left, top], i) => {
          const item = fade(progress * 100, i * 10, 30);
          return (
            <div
              key={label}
              style={{
                ...card,
                position: 'absolute',
                left: Number(left),
                top: Number(top),
                width: 330,
                height: 160,
                padding: 26,
                opacity: item,
                transform: `translateY(${interpolate(item, [0, 1], [24, 0])}px) rotate(${i % 2 === 0 ? -3 : 3}deg)`,
              }}
            >
              <div style={{ color: color as string, fontSize: 21, fontWeight: 900, textTransform: 'uppercase', letterSpacing: 1.4 }}>
                {label}
              </div>
              <div style={{ color: c.ink, marginTop: 24, fontSize: 32, fontWeight: 900 }}>{text}</div>
            </div>
          );
        })}
        <div
          style={{
            position: 'absolute',
            right: 40,
            bottom: 82,
            width: 430,
            height: 190,
            borderRadius: 34,
            background: `linear-gradient(135deg, ${c.teal}, ${c.mint})`,
            boxShadow: '0 40px 80px rgba(15, 118, 110, 0.28)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'white',
            fontSize: 42,
            fontWeight: 950,
          }}
        >
          Bitta tizim
        </div>
      </div>
    </div>
  </div>
);

const DashboardScene = ({ progress }: { progress: number }) => (
  <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', ...rise(progress, 42) }}>
    <AppChrome>
      <div style={{ height: '100%', background: c.wash, padding: 48 }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 24 }}>
          <Metric label="Jami tushum" value="33 mln" tone={c.blue} />
          <Metric label="Jami xarajat" value="19 mln" tone={c.red} />
          <Metric label="Depozit" value="700 ming" tone={c.blue} />
          <Metric label="Sof foyda" value="+14 mln" tone={c.green} />
        </div>
        <div style={{ ...card, marginTop: 40, padding: 34 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
            <div>
              <Kicker color={c.slate}>Reja bajarilishi</Kicker>
              <div style={{ marginTop: 18, color: c.ink, fontSize: 66, fontWeight: 950 }}>68%</div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 190px)', gap: 16 }}>
              <div style={{ ...card, padding: 18, boxShadow: 'none' }}>
                <div style={{ color: c.red, fontSize: 18, fontWeight: 900 }}>QARZ</div>
                <div style={{ color: c.ink, marginTop: 8, fontSize: 28, fontWeight: 900 }}>12 mln</div>
              </div>
              <div style={{ ...card, padding: 18, boxShadow: 'none' }}>
                <div style={{ color: c.green, fontSize: 18, fontWeight: 900 }}>REJAGA TO'LANGAN</div>
                <div style={{ color: c.ink, marginTop: 8, fontSize: 28, fontWeight: 900 }}>26 mln</div>
              </div>
            </div>
          </div>
          <div style={{ marginTop: 30, height: 18, borderRadius: 999, background: '#e2e8f0', overflow: 'hidden' }}>
            <div
              style={{
                width: `${interpolate(progress, [0, 1], [0, 68])}%`,
                height: '100%',
                borderRadius: 999,
                background: `linear-gradient(90deg, ${c.teal}, ${c.mint})`,
              }}
            />
          </div>
          <div style={{ marginTop: 18, display: 'flex', justifyContent: 'space-between', color: c.slate, fontSize: 20, fontWeight: 750 }}>
            <span>Jami kutilgan reja</span>
            <span>38 mln UZS</span>
          </div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1.1fr 0.9fr', gap: 28, marginTop: 40 }}>
          <div style={{ ...card, padding: 28 }}>
            <Kicker color={c.orange}>Depozit harakati</Kicker>
            <div style={{ color: c.slate, marginTop: 12, fontSize: 23, fontWeight: 650 }}>
              Depozit alohida ko'rinadi. Yangi tushum bilan aralashmaydi.
            </div>
          </div>
          <div style={{ ...card, padding: 28, display: 'flex', justifyContent: 'space-between' }}>
            <div>
              <div style={{ color: c.orange, fontSize: 18, fontWeight: 900 }}>TO'LDIRILDI</div>
              <div style={{ marginTop: 8, color: c.ink, fontSize: 30, fontWeight: 950 }}>700 000 UZS</div>
            </div>
            <div>
              <div style={{ color: c.slate, fontSize: 18, fontWeight: 900 }}>ISHLATILDI</div>
              <div style={{ marginTop: 8, color: c.ink, fontSize: 30, fontWeight: 950 }}>1 000 000 UZS</div>
            </div>
          </div>
        </div>
      </div>
    </AppChrome>
  </div>
);

const MoneyScene = ({ progress }: { progress: number }) => (
  <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 72, ...rise(progress, 46) }}>
    <div style={{ width: 620 }}>
      <Kicker>Kunlik ish tezligi</Kicker>
      <div style={{ height: 18 }} />
      <Title size={70}>O'tkazma bir marta kiritiladi. Hisobotlar o'zi yig'iladi.</Title>
      <div style={{ height: 26 }} />
      <Copy width={580}>Naqd, karta, chek, izoh, depozitdan foydalanish va maxsus kunlik reja bitta aniq modalda.</Copy>
    </div>
    <div style={{ ...card, width: 760, height: 650, overflow: 'hidden' }}>
      <div style={{ height: 88, borderBottom: '1px solid #e2e8f0', padding: '0 34px', display: 'flex', alignItems: 'center', gap: 18 }}>
        <div style={{ width: 50, height: 50, borderRadius: 16, background: '#ecfdf5' }} />
        <div>
          <div style={{ color: c.ink, fontSize: 26, fontWeight: 900 }}>Yangi o'tkazma</div>
          <div style={{ color: c.slate, fontSize: 18, fontWeight: 650 }}>Tushum</div>
        </div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', height: 'calc(100% - 88px)' }}>
        <div style={{ padding: 34, borderRight: '1px solid #e2e8f0' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, padding: 8, borderRadius: 18, background: '#eef2ff' }}>
            {['Tushum', 'Chiqim', 'Dam', 'Ishlamagan'].map((label, i) => (
              <div
                key={label}
                style={{
                  borderRadius: 14,
                  padding: '14px 8px',
                  textAlign: 'center',
                  background: i === 0 ? c.mint : 'transparent',
                  color: i === 0 ? c.ink : c.slate,
                  fontSize: 16,
                  fontWeight: 900,
                }}
              >
                {label}
              </div>
            ))}
          </div>
          <div style={{ marginTop: 32 }}>
            {[
              ['Haydovchi', "Habibulloh - 01 337 UKA"],
              ['Vaqt', '24/5/2026'],
              ['Summa', '500 000 UZS'],
            ].map(([label, value]) => (
              <div key={label} style={{ marginBottom: 22 }}>
                <div style={{ color: c.slate, fontSize: 17, fontWeight: 900, textTransform: 'uppercase', letterSpacing: 1.6 }}>{label}</div>
                <div style={{ marginTop: 8, borderRadius: 18, border: `1px solid ${c.line}`, padding: '18px 20px', color: c.ink, fontSize: 24, fontWeight: 850 }}>
                  {value}
                </div>
              </div>
            ))}
          </div>
          <div style={{ borderRadius: 18, background: '#fff7ed', border: '1px solid #fed7aa', padding: 20 }}>
            <div style={{ color: c.orange, fontSize: 18, fontWeight: 900 }}>Maxsus kunlik reja</div>
            <div style={{ color: c.slate, marginTop: 7, fontSize: 18 }}>Faqat shu kun uchun.</div>
          </div>
        </div>
        <div style={{ padding: 34 }}>
          <div style={{ color: c.slate, fontSize: 17, fontWeight: 900, textTransform: 'uppercase', letterSpacing: 1.6 }}>To'lov usuli</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 18, marginTop: 12 }}>
            <div style={{ borderRadius: 20, border: `1px solid ${c.mint}`, background: '#ecfdf5', height: 92, display: 'flex', alignItems: 'center', justifyContent: 'center', color: c.teal, fontSize: 22, fontWeight: 900 }}>Naqd</div>
            <div style={{ borderRadius: 20, border: `1px solid ${c.line}`, height: 92, display: 'flex', alignItems: 'center', justifyContent: 'center', color: c.slate, fontSize: 22, fontWeight: 900 }}>Karta</div>
          </div>
          <div style={{ marginTop: 28, borderRadius: 24, border: '2px dashed #cbd5e1', height: 150, display: 'flex', alignItems: 'center', justifyContent: 'center', color: c.slate, fontSize: 22, fontWeight: 850 }}>
            Chekni yuklash
          </div>
          <div style={{ marginTop: 28 }}>
            <div style={{ color: c.slate, fontSize: 17, fontWeight: 900, textTransform: 'uppercase', letterSpacing: 1.6 }}>Izoh</div>
            <div style={{ marginTop: 10, height: 130, borderRadius: 20, border: `1px solid ${c.line}`, color: c.slate, fontSize: 22, padding: 20 }}>Karta/chek orqali kirim</div>
          </div>
          <div style={{ marginTop: 36, height: 70, borderRadius: 18, background: c.teal, color: 'white', fontSize: 24, fontWeight: 900, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            Saqlash
          </div>
        </div>
      </div>
    </div>
  </div>
);

const CalendarScene = ({ progress }: { progress: number }) => {
  const days = [
    ['May 1', '500 000', "To'liq to'landi", c.green],
    ['May 2', 'Dam olish', 'Dam olish', c.blue],
    ['May 6', '400 000', 'Qarz: -100 000', c.red],
    ['May 10', '500 000', "To'liq to'landi", c.green],
    ['May 14', '0', 'Qarz: -500 000', c.red],
    ['May 16', '1 000 000', 'Ortiqcha +500 000', c.green],
    ['May 21', '0', 'Ishlamagan', c.slate],
    ['May 22', '500 000', "To'liq to'landi", c.green],
  ];

  return (
    <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', ...rise(progress, 40) }}>
      <div style={{ ...appShell, width: 1400, height: 760, padding: 46 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <Kicker color={c.slate}>Oylik reja</Kicker>
            <div style={{ color: c.ink, fontSize: 48, fontWeight: 950, marginTop: 8 }}>May 2026</div>
          </div>
          <div style={{ display: 'flex', gap: 18, alignItems: 'center', color: c.slate, fontSize: 20, fontWeight: 850 }}>
            <span style={{ color: c.green }}>To'langan</span>
            <span style={{ color: c.red }}>Qarz</span>
            <span style={{ color: c.blue }}>Dam olish</span>
          </div>
        </div>
        <div style={{ marginTop: 28, height: 16, borderRadius: 999, background: '#e2e8f0', overflow: 'hidden' }}>
          <div style={{ width: `${interpolate(progress, [0, 1], [0, 76])}%`, height: '100%', borderRadius: 999, background: `linear-gradient(90deg, ${c.teal}, ${c.mint})` }} />
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 22, marginTop: 36 }}>
          {days.map(([date, amount, status, tone], i) => {
            const item = fade(progress * 100, i * 6, 24);
            return (
              <div
                key={date}
                style={{
                  ...card,
                  height: 188,
                  padding: 24,
                  boxShadow: '0 16px 34px rgba(15, 23, 42, 0.07)',
                  opacity: item,
                  transform: `translateY(${interpolate(item, [0, 1], [18, 0])}px)`,
                }}
              >
                <div style={{ color: c.ink, fontSize: 27, fontWeight: 950 }}>{date}, 2026</div>
                <div style={{ height: 1, background: '#e2e8f0', margin: '16px 0' }} />
                <div style={{ color: c.slate, fontSize: 20, fontWeight: 750 }}>Tushum:</div>
                <div style={{ color: c.ink, fontSize: 31, fontWeight: 950, marginTop: 3 }}>{amount} UZS</div>
                <div style={{ color: tone as string, fontSize: 19, fontWeight: 900, marginTop: 10 }}>{status}</div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

const OperationsScene = ({ progress }: { progress: number }) => (
  <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 70, ...rise(progress, 42) }}>
    <div style={{ ...card, width: 680, height: 680, padding: 42 }}>
      <Kicker color={c.slate}>Haydovchi profili</Kicker>
      <div style={{ display: 'flex', gap: 22, alignItems: 'center', marginTop: 26 }}>
        <div style={{ width: 96, height: 96, borderRadius: 30, background: '#e2e8f0' }} />
        <div>
          <div style={{ color: c.ink, fontSize: 36, fontWeight: 950 }}>Navro'zbek</div>
          <div style={{ color: c.slate, fontSize: 22, marginTop: 6 }}>+998 99 248 44 75</div>
        </div>
      </div>
      <div style={{ marginTop: 34, borderRadius: 26, background: '#f8fafc', border: `1px solid ${c.line}`, padding: 28 }}>
        <div style={{ color: c.green, fontSize: 18, fontWeight: 900, letterSpacing: 2 }}>HOZIRGI DAVR</div>
        <div style={{ color: c.ink, fontSize: 28, fontWeight: 950, marginTop: 14 }}>21.05.2026 - Hozir ishlayapti</div>
        <div style={{ color: c.slate, fontSize: 22, marginTop: 14 }}>Haydagan auto: BYD Song Plus</div>
      </div>
      <div style={{ marginTop: 18, borderRadius: 26, background: '#fff7ed', border: '1px solid #fed7aa', padding: 28 }}>
        <div style={{ color: c.orange, fontSize: 18, fontWeight: 900, letterSpacing: 2 }}>OLDINGI DAVR</div>
        <div style={{ color: c.ink, fontSize: 28, fontWeight: 950, marginTop: 14 }}>15.04.2026 - 01.05.2026</div>
        <div style={{ color: c.slate, fontSize: 22, marginTop: 14 }}>Haydagan auto: Hongqi EQM5</div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 18, marginTop: 28 }}>
        <div style={{ ...card, padding: 20, boxShadow: 'none' }}>
          <div style={{ color: c.slate, fontSize: 18, fontWeight: 850 }}>To'langan</div>
          <div style={{ color: c.green, marginTop: 8, fontSize: 29, fontWeight: 950 }}>4.5 mln</div>
        </div>
        <div style={{ ...card, padding: 20, boxShadow: 'none' }}>
          <div style={{ color: c.slate, fontSize: 18, fontWeight: 850 }}>Qarz</div>
          <div style={{ color: c.red, marginTop: 8, fontSize: 29, fontWeight: 950 }}>3.5 mln</div>
        </div>
      </div>
    </div>
    <div style={{ width: 620 }}>
      <Kicker>Tarix yo'qolmaydi</Kicker>
      <div style={{ height: 18 }} />
      <Title size={72}>Ishga olish, bo'shatish va qayta biriktirish aniq ko'rinadi.</Title>
      <div style={{ height: 28 }} />
      <Copy width={600}>Kim qaysi mashinada ishlagan, qachon qarz qolgan, qachon qayta kelgan - hammasi profil ichida.</Copy>
    </div>
  </div>
);

const ReminderScene = ({ progress }: { progress: number }) => (
  <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', ...rise(progress, 40) }}>
    <div style={{ display: 'grid', gridTemplateColumns: '0.9fr 1.1fr', gap: 70, width: 1380, alignItems: 'center' }}>
      <div>
        <Kicker>Ogohlantirishlar</Kicker>
        <div style={{ height: 18 }} />
        <Title size={72}>Hujjat muddati o'tib ketishini tizim eslatadi.</Title>
        <div style={{ height: 28 }} />
        <Copy width={620}>Ishonchnoma, sug'urta, texnik ko'rik, tanirovka va depozit ogohlantirishlari bitta qo'ng'iroqda.</Copy>
      </div>
      <div style={{ ...card, padding: 42 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 28 }}>
          <div>
            <Kicker color={c.slate}>Bildirishnomalar</Kicker>
            <div style={{ color: c.ink, fontSize: 42, fontWeight: 950, marginTop: 6 }}>Bugungi nazorat</div>
          </div>
          <div style={{ width: 78, height: 78, borderRadius: 26, background: '#ecfdf5', display: 'flex', alignItems: 'center', justifyContent: 'center', color: c.teal, fontSize: 36, fontWeight: 950 }}>3</div>
        </div>
        {[
          ['Ishonchnoma', 'Navro\'zbek - 28-may eslatma', c.teal],
          ["Sug'urta", 'Hongqi EQM5 - 3 kun qoldi', c.green],
          ['Depozit', 'Habibulloh - qoldiq kamaydi', c.orange],
        ].map(([title, text, tone], i) => {
          const item = fade(progress * 100, i * 12, 30);
          return (
            <div
              key={title}
              style={{
                borderRadius: 24,
                background: '#f8fafc',
                border: `1px solid ${c.line}`,
                padding: 24,
                display: 'flex',
                alignItems: 'center',
                gap: 22,
                marginTop: i === 0 ? 0 : 18,
                opacity: item,
                transform: `translateX(${interpolate(item, [0, 1], [22, 0])}px)`,
              }}
            >
              <div style={{ width: 56, height: 56, borderRadius: 18, background: `${tone}18`, border: `1px solid ${tone}33` }} />
              <div>
                <div style={{ color: tone as string, fontSize: 20, fontWeight: 900, textTransform: 'uppercase', letterSpacing: 1.2 }}>{title}</div>
                <div style={{ color: c.ink, marginTop: 6, fontSize: 25, fontWeight: 850 }}>{text}</div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  </div>
);

const FinalScene = ({ progress }: { progress: number }) => (
  <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', textAlign: 'center', ...rise(progress, 20) }}>
    <div>
      <Img src={staticFile('images/taksapark-logo.png')} style={{ width: 520, objectFit: 'contain', margin: '0 auto' }} />
      <div style={{ height: 54 }} />
      <Title size={86}>Avtoparkni Excel emas, tizim boshqarsin.</Title>
      <div style={{ height: 26 }} />
      <Copy width={900}>Taksapark.uz - tushum, reja, depozit, haydovchi, mashina va eslatmalar uchun yagona boshqaruv paneli.</Copy>
      <div style={{ display: 'flex', justifyContent: 'center', gap: 18, marginTop: 56 }}>
        {['Moliyaviy nazorat', 'Oylik reja', 'Hujjat eslatmalari'].map((label) => (
          <div
            key={label}
            style={{
              borderRadius: 999,
              padding: '16px 24px',
              background: '#ecfdf5',
              color: c.teal,
              fontSize: 24,
              fontWeight: 900,
            }}
          >
            {label}
          </div>
        ))}
      </div>
    </div>
  </div>
);

export const TaksaparkPromo = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = (seconds: number) => seconds * fps;

  const bg = interpolate(frame, [0, t(24)], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const intro = scene(frame, t(0), t(4.6));
  const dashboard = scene(frame, t(4.0), t(8.9));
  const money = scene(frame, t(8.2), t(12.9));
  const calendar = scene(frame, t(12.2), t(16.8));
  const operations = scene(frame, t(16.1), t(20.7));
  const reminders = scene(frame, t(20.0), t(23.0));
  const finale = fade(frame, t(22.5), 32);

  return (
    <AbsoluteFill
      style={{
        background: `linear-gradient(${126 + bg * 18}deg, #f8fafc 0%, #eef2ff 48%, #ccfbf1 100%)`,
        fontFamily: 'Inter, SF Pro Display, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif',
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          position: 'absolute',
          width: 820,
          height: 820,
          borderRadius: '50%',
          background: 'rgba(45, 212, 191, 0.16)',
          filter: 'blur(80px)',
          right: -180,
          top: -220,
          transform: `translateX(${bg * 90}px)`,
        }}
      />
      <div
        style={{
          position: 'absolute',
          width: 720,
          height: 720,
          borderRadius: '50%',
          background: 'rgba(37, 99, 235, 0.1)',
          filter: 'blur(90px)',
          left: -220,
          bottom: -220,
          transform: `translateY(${-bg * 80}px)`,
        }}
      />
      <IntroScene progress={intro} />
      <DashboardScene progress={dashboard} />
      <MoneyScene progress={money} />
      <CalendarScene progress={calendar} />
      <OperationsScene progress={operations} />
      <ReminderScene progress={reminders} />
      <FinalScene progress={finale} />
    </AbsoluteFill>
  );
};
