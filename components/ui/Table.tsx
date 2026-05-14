import React from 'react';

interface TableProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
}

export const Table: React.FC<TableProps> = ({ children, className, ...props }) => {
  return (
    <div className={['w-full overflow-x-auto', className].filter(Boolean).join(' ')} {...props}>
      <table className="w-full text-left border-collapse">
        {children}
      </table>
    </div>
  );
};

export const TableHeader: React.FC<React.HTMLAttributes<HTMLTableSectionElement>> = ({ children, className, ...props }) => (
  <thead className={['border-b border-border bg-bg-subtle/70', className].filter(Boolean).join(' ')} {...props}>
    {children}
  </thead>
);

export const TableBody: React.FC<React.HTMLAttributes<HTMLTableSectionElement>> = ({ children, className, ...props }) => (
  <tbody className={['divide-y divide-border-subtle', className].filter(Boolean).join(' ')} {...props}>{children}</tbody>
);

export const TableRow: React.FC<React.HTMLAttributes<HTMLTableRowElement> & { hover?: boolean }> = ({ children, className, hover = true, ...props }) => (
  <tr className={[
    'transition-colors',
    hover ? 'hover:bg-bg-subtle/60' : '',
    className,
  ].filter(Boolean).join(' ')} {...props}>
    {children}
  </tr>
);

export const TableHead: React.FC<React.ThHTMLAttributes<HTMLTableCellElement>> = ({ children, className, ...props }) => (
  <th className={[
    'px-4 py-2.5 text-[11px] font-semibold text-text-3 uppercase tracking-[0.05em]',
    className,
  ].filter(Boolean).join(' ')} {...props}>
    {children}
  </th>
);

export const TableCell: React.FC<React.TdHTMLAttributes<HTMLTableCellElement>> = ({ children, className, ...props }) => (
  <td className={['px-4 py-3 text-[13px] text-text-1', className].filter(Boolean).join(' ')} {...props}>
    {children}
  </td>
);
