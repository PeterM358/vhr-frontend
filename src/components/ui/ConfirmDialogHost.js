import React, { useCallback, useEffect, useRef, useState } from 'react';

import ConfirmDialog from './ConfirmDialog';
import { registerConfirmDialog } from '../../utils/confirmDialogRef';
import { useTranslation } from '../../i18n';

export default function ConfirmDialogHost() {
  const { t } = useTranslation();
  const [state, setState] = useState(null);
  const resolveRef = useRef(null);

  useEffect(() => {
    registerConfirmDialog((payload) => {
      if (resolveRef.current) {
        resolveRef.current(false);
        resolveRef.current = null;
      }
      resolveRef.current = payload.resolve;
      setState({
        id: payload.id,
        title: payload.title,
        message: payload.message,
        confirmLabel: payload.confirmLabel,
        cancelLabel: payload.cancelLabel,
        destructive: payload.destructive,
      });
    });
    return () => registerConfirmDialog(null);
  }, []);

  const finish = useCallback((ok) => {
    const resolve = resolveRef.current;
    resolveRef.current = null;
    setState(null);
    if (resolve) resolve(ok);
  }, []);

  return (
    <ConfirmDialog
      visible={Boolean(state)}
      title={state?.title || ''}
      message={state?.message || ''}
      confirmLabel={state?.confirmLabel || t('common.ok', null, 'OK')}
      cancelLabel={state?.cancelLabel || t('common.cancel', null, 'Cancel')}
      destructive={Boolean(state?.destructive)}
      onConfirm={() => finish(true)}
      onCancel={() => finish(false)}
    />
  );
}
