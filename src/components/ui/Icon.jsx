import { ICONS } from '../../constants/icons';

export default function Icon({ n, size = 16, cls = '' }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={cls}
      style={n === 'loader' ? { animation: 'spin .9s linear infinite' } : undefined}
      dangerouslySetInnerHTML={{ __html: ICONS[n] || '' }}
    />
  );
}
