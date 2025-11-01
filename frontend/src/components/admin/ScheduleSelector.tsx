/**
 * AssetFlow - Schedule Selector Component
 * Simple UI for selecting backup/snapshot schedule times
 */

import React from 'react';
import { Form, Row, Col } from 'react-bootstrap';

export interface ScheduleTime {
  hour: string;
  minute: string;
}

interface ScheduleSelectorProps {
  value: ScheduleTime;
  onChange: (schedule: ScheduleTime) => void;
  label?: string;
  disabled?: boolean;
}

export const ScheduleSelector: React.FC<ScheduleSelectorProps> = ({
  value,
  onChange,
  label = 'Horario de Ejecución',
  disabled = false
}) => {
  // Generate hour options (00-23)
  const hourOptions = Array.from({ length: 24 }, (_, i) => {
    const hour = i.toString().padStart(2, '0');
    return (
      <option key={hour} value={hour}>
        {hour}
      </option>
    );
  });

  // Generate minute options (00, 15, 30, 45)
  const minuteOptions = ['00', '15', '30', '45'].map(minute => (
    <option key={minute} value={minute}>
      {minute}
    </option>
  ));

  const handleHourChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    onChange({
      ...value,
      hour: e.target.value
    });
  };

  const handleMinuteChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    onChange({
      ...value,
      minute: e.target.value
    });
  };

  return (
    <Form.Group>
      <Form.Label className="fw-semibold">{label}</Form.Label>
      <Row>
        <Col xs={6}>
          <Form.Select
            value={value.hour}
            onChange={handleHourChange}
            disabled={disabled}
          >
            {hourOptions}
          </Form.Select>
          <Form.Text className="text-muted">Hora (00-23)</Form.Text>
        </Col>
        <Col xs={6}>
          <Form.Select
            value={value.minute}
            onChange={handleMinuteChange}
            disabled={disabled}
          >
            {minuteOptions}
          </Form.Select>
          <Form.Text className="text-muted">Minutos</Form.Text>
        </Col>
      </Row>
      <Form.Text className="text-muted d-block mt-2">
        Ejecución diaria a las {value.hour}:{value.minute}
      </Form.Text>
    </Form.Group>
  );
};

/**
 * Convert ScheduleTime to cron expression
 */
export const scheduleToCron = (schedule: ScheduleTime): string => {
  return `${schedule.minute} ${schedule.hour} * * *`;
};

/**
 * Convert cron expression to ScheduleTime
 */
export const cronToSchedule = (cron: string): ScheduleTime => {
  const parts = cron.trim().split(' ');
  return {
    minute: parts[0] || '00',
    hour: parts[1] || '02'
  };
};

export default ScheduleSelector;
