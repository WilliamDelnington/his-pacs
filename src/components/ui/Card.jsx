export default function Card({ title, sub, badge, icon, children, cls = '' }) {
  return (
    <div className={`bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden ${cls}`}>
      {(title || badge) && (
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 bg-gray-50">
          <div className="flex items-center gap-2">
            {icon && <span className="text-gray-500">{icon}</span>}
            <div>
              <h3 className="text-sm font-semibold text-gray-800">{title}</h3>
              {sub && <p className="text-xs text-gray-500">{sub}</p>}
            </div>
          </div>
          {badge}
        </div>
      )}
      <div className="p-4">{children}</div>
    </div>
  );
}
