import { useState } from 'react';
import { useAppStore } from '../store/useAppStore';
import { useUiStore } from '../store/useUiStore';
import { Modal } from './ui/Modal';
import { MAX_FOCUS_GOAL, MIN_FOCUS_GOAL } from '../lib/goals';
import { requestNotificationPermission } from '../hooks/useNotifications';
import type { CalendarType, UserSettings } from '../types';

function Switch({
  checked,
  onChange,
  label,
  hint,
}: {
  checked: boolean;
  onChange: (next: boolean) => void;
  label: string;
  hint?: string;
}) {
  return (
    <div className="flex items-start justify-between gap-4 py-2.5">
      <div className="min-w-0">
        <div className="text-sm font-medium text-ink">{label}</div>
        {hint ? <div className="mt-0.5 text-xs text-idle">{hint}</div> : null}
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        onClick={() => onChange(!checked)}
        className={`relative h-6 w-11 shrink-0 rounded-full transition ${
          checked ? 'bg-primary' : 'bg-idle/50'
        }`}
      >
        <span
          className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all ${
            checked ? 'left-[22px]' : 'left-0.5'
          }`}
        />
      </button>
    </div>
  );
}

function Segment<T extends string>({
  value,
  options,
  onChange,
  label,
}: {
  value: T;
  options: { value: T; label: string }[];
  onChange: (v: T) => void;
  label: string;
}) {
  return (
    <div className="py-2.5">
      <div className="mb-1.5 text-sm font-medium text-ink">{label}</div>
      <div className="flex gap-1.5 rounded-xl bg-idle-soft/45 p-1 dark:bg-white/5">
        {options.map((opt) => (
          <button
            key={opt.value}
            type="button"
            onClick={() => onChange(opt.value)}
            aria-pressed={value === opt.value}
            className={`flex-1 rounded-lg px-2 py-1.5 text-sm font-medium transition ${
              value === opt.value
                ? 'bg-surface text-primary shadow-sm dark:bg-slate-700'
                : 'text-idle hover:text-ink'
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>
    </div>
  );
}

/**
 * Settings (PRD §3). The focus-goal control is where the deferred-reduction
 * rule becomes visible: shrinking the goal mid-commitment schedules it for
 * tomorrow instead of truncating today.
 */
export function SettingsModal() {
  const open = useUiStore((s) => s.settingsOpen);
  const close = useUiStore((s) => s.closeSettings);
  const settings = useAppStore((s) => s.settings);
  const setFocusGoal = useAppStore((s) => s.setFocusGoal);
  const updateSettings = useAppStore((s) => s.updateSettings);

  const [note, setNote] = useState<string | null>(null);

  const goals = Array.from(
    { length: MAX_FOCUS_GOAL - MIN_FOCUS_GOAL + 1 },
    (_, i) => MIN_FOCUS_GOAL + i,
  );

  const onGoal = async (value: number) => {
    const plan = await setFocusGoal(value);
    if (plan.deferred && plan.pending != null) {
      setNote(`Reducing to ${plan.pending} is queued for tomorrow — today keeps its ${plan.goal} slots.`);
    } else {
      setNote(null);
    }
  };

  const onNotifications = async (next: boolean) => {
    if (!next) {
      await updateSettings({ enableBrowserNotifications: false });
      setNote(null);
      return;
    }
    const granted = await requestNotificationPermission();
    await updateSettings({ enableBrowserNotifications: granted });
    setNote(granted ? null : 'Notifications are blocked in your browser settings.');
  };

  const void_ = (patch: Partial<UserSettings>) => void updateSettings(patch);

  return (
    <Modal
      open={open}
      onOpenChange={(next) => {
        if (!next) close();
      }}
      title="Settings"
      description="Everything stays on this device. No account, ever."
      width="max-w-lg"
    >
      <div className="max-h-[65vh] divide-y divide-idle-soft/60 overflow-y-auto pr-1 dark:divide-white/10">
        <div className="py-3">
          <div className="mb-1.5 flex items-baseline justify-between">
            <span className="text-sm font-medium text-ink">Daily focus goal</span>
            <span className="text-xs text-idle">
              {settings.dailyFocusGoal} slot{settings.dailyFocusGoal === 1 ? '' : 's'}
            </span>
          </div>
          <div className="flex gap-1.5">
            {goals.map((g) => (
              <button
                key={g}
                type="button"
                onClick={() => void onGoal(g)}
                aria-pressed={settings.dailyFocusGoal === g}
                className={`h-9 flex-1 rounded-lg text-sm font-semibold transition ${
                  settings.dailyFocusGoal === g
                    ? 'bg-primary text-white shadow-sm'
                    : 'bg-idle-soft/50 text-idle hover:bg-idle-soft hover:text-ink dark:bg-white/10'
                }`}
              >
                {g}
              </button>
            ))}
          </div>
          <p className="mt-1.5 text-xs text-idle">
            {settings.pendingDailyFocusGoal != null
              ? `Reducing to ${settings.pendingDailyFocusGoal} starts tomorrow so today’s commitments stay intact.`
              : 'Raising the goal adds a slot immediately.'}
          </p>
          {note ? (
            <p className="mt-1.5 rounded-lg bg-primary/10 px-2.5 py-1.5 text-xs text-primary">
              {note}
            </p>
          ) : null}
        </div>

        <Segment<UserSettings['themeMode']>
          label="Appearance"
          value={settings.themeMode}
          onChange={(v) => void_({ themeMode: v })}
          options={[
            { value: 'system', label: 'System' },
            { value: 'light', label: 'Light' },
            { value: 'dark', label: 'Dark' },
          ]}
        />

        <Segment<CalendarType>
          label="Calendar"
          value={settings.calendarType}
          onChange={(v) => void_({ calendarType: v })}
          options={[
            { value: 'jalali', label: 'Jalali (شمسی)' },
            { value: 'gregorian', label: 'Gregorian' },
          ]}
        />

        <div className="divide-y divide-idle-soft/60 dark:divide-white/10">
          <Switch
            label="Sound & haptics"
            hint="A soft tick when a step is checked."
            checked={settings.enableSoundHaptics}
            onChange={(v) => void_({ enableSoundHaptics: v })}
          />
          <Switch
            label="Browser notifications"
            hint="Gentle alerts for today’s timed reminders."
            checked={settings.enableBrowserNotifications}
            onChange={(v) => void onNotifications(v)}
          />
        </div>

        <div className="py-3 text-xs leading-relaxed text-idle">
          <p>
            Qadam stores everything locally in your browser. Clearing site data
            removes it — there is no cloud copy.
          </p>
        </div>
      </div>
    </Modal>
  );
}

