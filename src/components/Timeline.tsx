import React from 'react';
import { Milestone } from '../types';
import { DayMap } from './DayMap';

interface TimelineProps {
  milestones: Milestone[];
  onToggleMilestone: (id: string) => void;
}

export const Timeline: React.FC<TimelineProps> = ({ milestones, onToggleMilestone }) => {
  return (
    <div className="h-[calc(100vh-280px)] min-h-[500px]">
      <DayMap milestones={milestones} onToggleMilestone={onToggleMilestone} />
    </div>
  );
};
