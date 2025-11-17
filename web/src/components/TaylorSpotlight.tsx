const palette = {
  rose: 'var(--color-sunset-rose)',
  pastel: 'rgba(var(--color-cloud-lilac-rgb), 0.85)',
  butter: 'var(--color-golden-champagne)',
  sky: 'rgba(var(--color-taylor-glow-rgb), 0.8)',
  periwinkle: 'var(--color-cloud-lilac)',
  lilac: 'rgba(var(--color-cloud-lilac-rgb), 0.7)',
  mocha: 'var(--color-midnight-violet)',
  cloud: 'rgba(var(--color-text-secondary-rgb), 0.25)',
}

export default function TaylorSpotlight() {
  const paletteChips = [
    'Lover Rose',
    'Cloud Lilac',
    'Butter Glow',
    'Sky Fade'
  ]

  const metrics = [
    {
      label: '全球热度',
      value: '+42%',
      subLabel: '社交声量环比',
      accent: palette.rose,
      shadow: 'rgba(var(--color-sunset-rose-rgb), 0.25)',
    },
    {
      label: 'AI提及',
      value: '326',
      subLabel: '本周模型提到次数',
      accent: palette.sky,
      shadow: 'rgba(var(--color-taylor-glow-rgb), 0.25)',
    },
    {
      label: '巡演场次',
      value: '152',
      subLabel: '仍在进行的城市',
      accent: palette.mocha,
      shadow: 'rgba(var(--color-midnight-violet-rgb), 0.25)',
    },
  ]

  return (
    <section
      aria-labelledby="taylor-spotlight"
      className="relative overflow-hidden rounded-3xl p-[1px] mb-10"
      style={{
        background: `linear-gradient(135deg, ${palette.rose} 0%, ${palette.butter} 45%, ${palette.periwinkle} 100%)`,
        boxShadow: '0 25px 60px rgba(var(--color-sunset-rose-rgb), 0.35)',
      }}
    >
      <div className="relative rounded-[calc(1.5rem-1px)] bg-panel backdrop-blur-xl px-8 py-10">
        <div
          className="absolute -right-12 -top-10 h-48 w-48 rounded-full blur-[120px] opacity-70 pointer-events-none"
          style={{ background: palette.pastel }}
        />
        <div
          className="absolute -left-14 bottom-0 h-44 w-44 rounded-full blur-[120px] opacity-60 pointer-events-none"
          style={{ background: palette.sky }}
        />

        <div className="relative flex flex-col gap-10 lg:flex-row lg:items-center lg:justify-between">
          <div className="max-w-2xl">
            <p className="uppercase text-xs tracking-[0.3em] text-secondary font-semibold mb-4">
              Lover Color Capsule
            </p>
            <h2 id="taylor-spotlight" className="text-3xl lg:text-4xl font-bold text-primary leading-tight">
              Syunjyun Agent · Spotlight
            </h2>
            <p className="mt-4 text-base text-secondary">
              我们将 Lover 专辑的柔焦粉蓝作为 Syunjyun Agent 的默认配色，营造轻盈、温暖的监控面板体验，
              方便团队在浏览 AI 新闻时维持稳定的视觉节奏。
            </p>

            <div className="mt-6 flex flex-wrap gap-2">
              {paletteChips.map(chip => (
                <span
                  key={chip}
                  className="rounded-full border border-soft bg-card px-3 py-1 text-xs font-medium text-secondary backdrop-blur-md"
                >
                  {chip}
                </span>
              ))}
            </div>
            <p className="mt-6 text-sm text-secondary">
              Lover 调色板为默认视觉语言，无需切换模式；所有文化脉冲卡片会自动沿用该方案。
            </p>
          </div>

          <div className="grid w-full max-w-md grid-cols-1 gap-4 sm:grid-cols-3">
            {metrics.map(metric => (
              <div
                key={metric.label}
                className="rounded-2xl p-4 text-center shadow-lg border border-soft bg-panel"
                style={{
                  boxShadow: `0 20px 40px ${metric.shadow}`,
                }}
              >
                <div className="text-[0.8rem] text-secondary">{metric.label}</div>
                <div
                  className="mt-2 text-3xl font-semibold font-rounded"
                  style={{ color: metric.accent }}
                >
                  {metric.value}
                </div>
                <div className="mt-1 text-xs text-secondary">{metric.subLabel}</div>
              </div>
            ))}
          </div>
        </div>

        <div
          className="relative mt-10 rounded-2xl border border-soft p-5 bg-panel"
          style={{
            background: `linear-gradient(120deg, ${palette.pastel} 0%, ${palette.sky} 55%, ${palette.cloud} 100%)`,
          }}
        >
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-semibold text-secondary">
                Palette Signal
              </p>
              <p className="text-sm text-secondary">
                色彩语义已同步至提示模板，保证资讯聚合页面的情绪一致性
              </p>
            </div>
            <div className="flex items-center gap-3">
              <div
                className="h-10 w-10 rounded-xl text-inverse flex items-center justify-center shadow-lg"
                style={{
                  background: `linear-gradient(130deg, ${palette.rose}, ${palette.lilac})`,
                  boxShadow: '0 15px 30px rgba(var(--color-sunset-rose-rgb), 0.25)',
                }}
              >
                LG
              </div>
              <div>
                <p className="text-sm text-primary">
                  最新色彩脉冲：<span className="font-semibold">Lover Glow</span>
                </p>
                <p className="text-xs text-secondary">用于行业观察、粉丝增长与情绪板分析</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

