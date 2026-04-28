import React, { useMemo } from 'react';
import Column from '../../layout/Column';
import Row from '../../layout/Row';
import AppDropdown, { AppDropdownOption } from './AppDropdown';
import FontText from '../text/FontText';

interface FontTimeInputProps {
    value?: string;
    onChangeText: (value: string) => void;
    className?: string;
}

const HOUR_OPTIONS: AppDropdownOption[] = Array.from({ length: 12 }, (_, index) => {
    const hour = index + 1;
    return {
        value: `${hour}`,
        label: `${hour}`,
    };
});

const MINUTE_OPTIONS: AppDropdownOption[] = Array.from({ length: 60 }, (_, index) => {
    const minute = `${index}`.padStart(2, '0');
    return {
        value: minute,
        label: minute,
    };
});

const PERIOD_OPTIONS: AppDropdownOption[] = [
    { value: 'AM', label: 'AM' },
    { value: 'PM', label: 'PM' },
];

const getTimeParts = (value?: string) => {
    const [hourString = '8', minuteString = '00'] = (value ?? '').split(':');
    const parsedHour = Number(hourString);
    const parsedMinute = Number(minuteString);

    if (Number.isNaN(parsedHour) || parsedHour < 0 || parsedHour > 23 || Number.isNaN(parsedMinute) || parsedMinute < 0 || parsedMinute > 59) {
        return {
            hour12: '8',
            minute: '00',
            period: 'AM',
        };
    }

    return {
        hour12: `${parsedHour % 12 || 12}`,
        minute: `${parsedMinute}`.padStart(2, '0'),
        period: parsedHour >= 12 ? 'PM' : 'AM',
    };
};

const toCanonicalTime = (hour12: string, minute: string, period: string) => {
    const parsedHour12 = Number(hour12);
    const parsedMinute = Number(minute);

    if (Number.isNaN(parsedHour12) || Number.isNaN(parsedMinute)) {
        return '08:00';
    }

    let hour24 = parsedHour12 % 12;
    if (period === 'PM') {
        hour24 += 12;
    }

    return `${`${hour24}`.padStart(2, '0')}:${`${parsedMinute}`.padStart(2, '0')}`;
};

const FontTimeInput = ({ value = '08:00', onChangeText, className = '' }: FontTimeInputProps) => {
    const timeParts = useMemo(() => getTimeParts(value), [value]);

    return (
        <Column className={`gap-2 ${className ?? ''}`.trim()}>
            <Row className='gap-4 items-center'>
                <AppDropdown
                    options={HOUR_OPTIONS}
                    value={timeParts.hour12}
                    onValueChange={(nextHour) => onChangeText(toCanonicalTime(nextHour, timeParts.minute, timeParts.period))}
                    triggerClassName='min-w-[86px] rounded-2xl border border-border/15 bg-text/5 px-3 py-3'
                    contentClassName='border border-border/15'
                />
                <FontText weight='medium' className='opacity-40'>:</FontText>
                <AppDropdown
                    options={MINUTE_OPTIONS}
                    value={timeParts.minute}
                    onValueChange={(nextMinute) => onChangeText(toCanonicalTime(timeParts.hour12, nextMinute, timeParts.period))}
                    triggerClassName='min-w-[86px] rounded-2xl border border-border/15 bg-text/5 px-3 py-3'
                    contentClassName='border border-border/15'
                />
                <AppDropdown
                    options={PERIOD_OPTIONS}
                    value={timeParts.period}
                    onValueChange={(nextPeriod) => onChangeText(toCanonicalTime(timeParts.hour12, timeParts.minute, nextPeriod))}
                    triggerClassName='min-w-[92px] rounded-2xl border border-border/15 bg-text/5 px-3 py-3'
                    contentClassName='border border-border/15'
                />
            </Row>
            <FontText variant='subtext'>Stored as {value}</FontText>
        </Column>
    );
};

export default FontTimeInput;
