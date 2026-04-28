import { GameSchedule, MarkdownInputState, PlayerActionValue } from '../types/multiplayer';

const DEFAULT_SCHEDULE: GameSchedule = {
    nightlyDeadlineTime: '22:00',
    actionDeadlineTime: '22:00',
    voteDeadlineTime: '22:00',
    wakeUpTime: '08:00',
    nightlyResponseReleaseTime: '08:00',
    newspaperReleaseTime: '08:00',
};

export const defaultGameSchedule = DEFAULT_SCHEDULE;

export const getWakeUpTime = (schedule: GameSchedule) => {
    return schedule.wakeUpTime || schedule.newspaperReleaseTime || schedule.nightlyResponseReleaseTime || defaultGameSchedule.wakeUpTime;
};

export const normalizeGameSchedule = (schedule?: Partial<GameSchedule> | null): GameSchedule => {
    const fallbackDeadlineTime = schedule?.actionDeadlineTime || schedule?.voteDeadlineTime || schedule?.nightlyDeadlineTime || defaultGameSchedule.nightlyDeadlineTime;
    const actionDeadlineTime = schedule?.actionDeadlineTime || fallbackDeadlineTime;
    const voteDeadlineTime = schedule?.voteDeadlineTime || fallbackDeadlineTime;
    const wakeUpTime = schedule?.wakeUpTime || schedule?.newspaperReleaseTime || schedule?.nightlyResponseReleaseTime || defaultGameSchedule.wakeUpTime;

    return {
        nightlyDeadlineTime: fallbackDeadlineTime,
        actionDeadlineTime,
        voteDeadlineTime,
        wakeUpTime,
        nightlyResponseReleaseTime: wakeUpTime,
        newspaperReleaseTime: wakeUpTime,
    };
};

export const getGameScopedKey = (baseKey: string, gameId: string) => {
    return `${baseKey}-${gameId}`;
};

export const createClientId = (prefix: string) => {
    return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
};

export const parseStoredDayDates = (dayDates: string[]) => {
    return dayDates.map((dateStr) => {
        const [month, day, year] = dateStr.split('/').map(Number);
        return new Date(year, month - 1, day);
    });
};

export const formatTimeLabel = (time24: string) => {
    const [hoursString, minutesString] = time24.split(':');
    const hours = Number(hoursString || '0');
    const minutes = Number(minutesString || '0');
    const suffix = hours >= 12 ? 'PM' : 'AM';
    const normalizedHours = hours % 12 || 12;
    const normalizedMinutes = `${minutes}`.padStart(2, '0');
    return `${normalizedHours}:${normalizedMinutes} ${suffix}`;
};

export const buildScheduledDate = (baseDate: Date, time24: string) => {
    const [hoursString, minutesString] = time24.split(':');
    const scheduledDate = new Date(baseDate);
    scheduledDate.setHours(Number(hoursString || '0'), Number(minutesString || '0'), 0, 0);
    return scheduledDate;
};

export const addDays = (date: Date, days: number) => {
    const nextDate = new Date(date);
    nextDate.setDate(nextDate.getDate() + days);
    return nextDate;
};

export const formatCalendarDateLabel = (date: Date, includeYear: boolean = false) => {
    const month = date.getMonth() + 1;
    const day = date.getDate();

    if (includeYear) {
        return `${month}/${day}/${date.getFullYear()}`;
    }

    return `${month}/${day}`;
};

const getCalendarDayValue = (date: Date) => {
    return Date.UTC(date.getFullYear(), date.getMonth(), date.getDate());
};

export const getRelativeCalendarLabel = (date: Date, casing: 'lower' | 'title' = 'title', now: Date = new Date()) => {
    const dayDifference = Math.round((getCalendarDayValue(date) - getCalendarDayValue(now)) / 86400000);
    const relativeLabel = dayDifference === -1 ? 'yesterday' : dayDifference === 0 ? 'today' : dayDifference === 1 ? 'tomorrow' : null;

    if (!relativeLabel) {
        return null;
    }

    return casing === 'title' ? `${relativeLabel.charAt(0).toUpperCase()}${relativeLabel.slice(1)}` : relativeLabel;
};

export const formatContextualDateLabel = (
    date: Date,
    fallbackLabel: string = formatCalendarDateLabel(date),
    now: Date = new Date(),
    casing: 'lower' | 'title' = 'title',
) => {
    return getRelativeCalendarLabel(date, casing, now) ?? fallbackLabel;
};

export const getDayEndDate = (dayDates: Date[], dayIndex: number, fallbackSpanDays: number = 1) => {
    const startDate = dayDates[dayIndex];
    if (!startDate) {
        return new Date();
    }

    const nextStartDate = dayDates[dayIndex + 1];
    if (nextStartDate) {
        return addDays(nextStartDate, -1);
    }

    return addDays(startDate, Math.max(fallbackSpanDays, 1) - 1);
};

export const getDayReleaseDate = (dayDates: Date[], dayIndex: number, wakeUpTime24: string) => {
    const nextStartDate = dayDates[dayIndex + 1];
    if (!nextStartDate) {
        return null;
    }

    return buildScheduledDate(nextStartDate, wakeUpTime24);
};

export const isDayContentReleased = (dayDates: Date[], dayIndex: number, wakeUpTime24: string, now: Date = new Date()) => {
    const releaseDate = getDayReleaseDate(dayDates, dayIndex, wakeUpTime24);
    if (!releaseDate) {
        return false;
    }

    return now.getTime() >= releaseDate.getTime();
};

export const getDayRangeLabel = (dayDates: Date[], dayIndex: number, fallbackSpanDays: number = 1) => {
    const startDate = dayDates[dayIndex];
    if (!startDate) {
        return '';
    }

    const endDate = getDayEndDate(dayDates, dayIndex, fallbackSpanDays);
    const includeYear = startDate.getFullYear() !== endDate.getFullYear();
    const startLabel = formatCalendarDateLabel(startDate, includeYear);
    const endLabel = formatCalendarDateLabel(endDate, includeYear);

    if (startDate.getTime() === endDate.getTime()) {
        return startLabel;
    }

    return `${startLabel} - ${endLabel}`;
};

export const getContextualDayRangeLabel = (dayDates: Date[], dayIndex: number, fallbackSpanDays: number = 1, now: Date = new Date()) => {
    const startDate = dayDates[dayIndex];
    if (!startDate) {
        return '';
    }

    const endDate = getDayEndDate(dayDates, dayIndex, fallbackSpanDays);
    const includeYear = startDate.getFullYear() !== endDate.getFullYear();
    const startLabel = formatContextualDateLabel(startDate, formatCalendarDateLabel(startDate, includeYear), now, 'title');
    const endLabel = formatContextualDateLabel(endDate, formatCalendarDateLabel(endDate, includeYear), now, 'title');

    if (startDate.getTime() === endDate.getTime()) {
        return startLabel;
    }

    return `${startLabel} - ${endLabel}`;
};

export const getCurrentPlayableDayIndex = (dayDates: Date[], now: Date = new Date()) => {
    if (dayDates.length === 0) {
        return 0;
    }

    const normalizedToday = new Date(now);
    normalizedToday.setHours(0, 0, 0, 0);

    const normalizedDays = dayDates.map((dayDate) => {
        const nextDate = new Date(dayDate);
        nextDate.setHours(0, 0, 0, 0);
        return nextDate;
    });

    const todayIndex = normalizedDays.findIndex((date) => date.getTime() === normalizedToday.getTime());
    if (todayIndex >= 0) {
        return todayIndex;
    }

    const latestPastIndex = normalizedDays.reduce((bestIndex, date, index) => {
        if (date.getTime() <= normalizedToday.getTime()) {
            return index;
        }
        return bestIndex;
    }, -1);

    if (latestPastIndex >= 0) {
        return latestPastIndex;
    }

    return 0;
};

export const isDayReleasedAtTime = (dayDate: Date, time24: string, now: Date = new Date()) => {
    return now.getTime() >= buildScheduledDate(dayDate, time24).getTime();
};

export const isNightWindowOpen = (dayDate: Date, deadlineTime24: string, now: Date = new Date()) => {
    const deadline = buildScheduledDate(dayDate, deadlineTime24);
    return now.getTime() <= deadline.getTime();
};

export const normalizePlayerActionState = (action: PlayerActionValue | undefined): MarkdownInputState => {
    if (!action) {
        return {};
    }

    if (typeof action === 'string') {
        const trimmedValue = action.trim();
        if (!trimmedValue.startsWith('{')) {
            return {};
        }

        try {
            const parsedValue = JSON.parse(trimmedValue) as MarkdownInputState;
            return typeof parsedValue === 'object' && parsedValue !== null ? parsedValue : {};
        } catch {
            return {};
        }
    }

    return action;
};

export const getPlayerActionSummary = (action: PlayerActionValue | undefined) => {
    if (!action) {
        return '';
    }

    if (typeof action === 'string') {
        return action;
    }

    const entries = Object.entries(action)
        .map(([label, value]) => [label, value?.trim() || ''] as const)
        .filter(([, value]) => value.length > 0);

    return entries.map(([label, value]) => `${label}: ${value}`).join(' • ');
};

export const hasPlayerActionContent = (action: PlayerActionValue | undefined) => {
    return getPlayerActionSummary(action).trim().length > 0;
};

export const getLatestReleasedDayIndex = (dayDates: Date[], wakeUpTime24: string, now: Date = new Date()) => {
    if (dayDates.length === 0) {
        return -1;
    }

    let latestReleasedIndex = -1;

    dayDates.forEach((dayDate, index) => {
        if (isDayContentReleased(dayDates, index, wakeUpTime24, now)) {
            latestReleasedIndex = index;
        }
    });

    return latestReleasedIndex;
};

export const formatCountdown = (targetDate: Date, now: Date = new Date()) => {
    const differenceMs = targetDate.getTime() - now.getTime();
    if (differenceMs <= 0) {
        return '00:00:00';
    }

    const totalSeconds = Math.floor(differenceMs / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    return [hours, minutes, seconds].map((value) => `${value}`.padStart(2, '0')).join(':');
};

export const formatRelativeDuration = (targetDate: Date, now: Date = new Date()) => {
    const differenceMs = targetDate.getTime() - now.getTime();
    if (differenceMs <= 0) {
        return 'now';
    }

    const totalMinutes = Math.ceil(differenceMs / 60000);
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;

    if (hours === 0) {
        return `${minutes}m`;
    }

    if (minutes === 0) {
        return `${hours}h`;
    }

    return `${hours}h ${minutes}m`;
};
