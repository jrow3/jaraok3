import { createToaster, type ToastMsg, type ToastOptions } from './toastQueue';

export type { ToastMsg, ToastOptions };

export const toastStore = $state<{ list: ToastMsg[] }>({ list: [] });

const toaster = createToaster(toastStore.list);

export const toast = (text: string, options?: ToastOptions) => toaster.show(text, options);
export const runToastAction = toaster.runAction;
