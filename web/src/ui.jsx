import React from 'react';
export function Modal({ onClose, children, drawer }) {
  return (
    <div className={'overlay' + (drawer ? '' : ' center')} onMouseDown={e => e.target === e.currentTarget && onClose()}>
      <div className={drawer ? 'drawer' : 'modal'}>{children}</div>
    </div>
  );
}
export const Field = ({ label, children }) => <div className="field"><label>{label}</label>{children}</div>;
export const STATUS = { neu: 'Neu', in_pruefung: 'In Prüfung', rueckfrage: 'Rückfrage', genehmigt: 'Genehmigt', abgelehnt: 'Abgelehnt', abgeschlossen: 'Abgeschlossen' };
