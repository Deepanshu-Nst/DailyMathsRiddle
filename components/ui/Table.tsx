import React from 'react';

interface TableProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  striped?: boolean;
  compact?: boolean;
}

export const Table: React.FC<TableProps> = ({ children, className, striped, compact, ...props }) => {
  return (
    <div className={['w-full overflow-x-auto', className].filter(Boolean).join(' ')} {...props}>
      <table className={['w-full text-left border-collapse', striped ? 'table-striped' : '', compact ? 'text-[12px]' : ''].filter(Boolean).join(' ')}>
        {children}
      </table>
    </div>
  );
};

export const TableHeader: React.FC<React.HTMLAttributes<HTMLTableSectionElement>> = ({ children, className, ...props }) => (
  <thead className={['border-b border-white/[0.08] bg-white/[0.02]', className].filter(Boolean).join(' ')} {...props}>
    {children}
  </thead>
);

export const TableBody: React.FC<React.HTMLAttributes<HTMLTableSectionElement>> = ({ children, className, ...props }) => (
  <tbody className={['divide-y divide-white/[0.05]', className].filter(Boolean).join(' ')} {...props}>{children}</tbody>
);

export const TableRow: React.FC<React.HTMLAttributes<HTMLTableRowElement> & { hover?: boolean }> = ({ children, className, hover = true, ...props }) => (
  <tr className={[
    'transition-standard',
    hover ? 'hover:bg-white/[0.03] hover:shadow-[inset_3px_0_0_var(--color-primary)]' : '',
    className,
  ].filter(Boolean).join(' ')} {...props}>
    {children}
  </tr>
);

export const TableHead: React.FC<React.ThHTMLAttributes<HTMLTableCellElement>> = ({ children, className, ...props }) => (
  <th className={[
    'px-5 py-3.5 text-[11px] font-bold text-text-3 uppercase tracking-[0.1em]',
    className,
  ].filter(Boolean).join(' ')} {...props}>
    {children}
  </th>
);

export const TableCell: React.FC<React.TdHTMLAttributes<HTMLTableCellElement>> = ({ children, className, ...props }) => (
  <td className={['px-5 py-4 text-[13px] text-text-1', className].filter(Boolean).join(' ')} {...props}>
    {children}
  </td>
);
