import { Fragment } from 'react';
import { STEPS } from '../../constants/steps';
import StepNode from './StepNode';
import Badge from '../ui/Badge';
import Icon from '../ui/Icon';

export default function Timeline({ done, active }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
      <h3 className="text-sm font-semibold text-gray-700 mb-4 flex items-center gap-2">
        <Icon n="activity" size={16} />Workflow Progress — 7 Steps
      </h3>
      <div className="flex items-start">
        {STEPS.map((s, i) => (
          <Fragment key={s.n}>
            <div className="flex flex-col items-center flex-1 min-w-0">
              <StepNode step={s.n} done={done.includes(s.n)} active={active === s.n} />
              <div className="text-center mt-1.5 px-0.5">
                <p className={`text-xs font-medium leading-tight ${
                  done.includes(s.n) ? 'text-green-700'
                  : active === s.n   ? 'text-indigo-700'
                  :                    'text-gray-400'
                }`}>
                  {s.label}
                </p>
                <Badge v={s.owner === 'HIS' ? 'his' : s.owner === 'UI' ? 'default' : 'orthanc'}>
                  {s.owner}
                </Badge>
              </div>
            </div>
            {i < STEPS.length - 1 && (
              <div className={`connector mt-4 ${done.includes(s.n) ? 'done' : ''}`} />
            )}
          </Fragment>
        ))}
      </div>
    </div>
  );
}
