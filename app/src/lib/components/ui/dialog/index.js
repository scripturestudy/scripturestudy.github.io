import { Dialog as DialogPrimitive } from 'bits-ui';

import Content from './dialog-content.svelte';
import Overlay from './dialog-overlay.svelte';
import Title from './dialog-title.svelte';
import Description from './dialog-description.svelte';
import Header from './dialog-header.svelte';
import Footer from './dialog-footer.svelte';

const Root = DialogPrimitive.Root;
const Trigger = DialogPrimitive.Trigger;
const Close = DialogPrimitive.Close;
const Portal = DialogPrimitive.Portal;

export {
  Root,
  Trigger,
  Close,
  Portal,
  Content,
  Overlay,
  Title,
  Description,
  Header,
  Footer,
  // Namespaced aliases
  Root as Dialog,
  Trigger as DialogTrigger,
  Close as DialogClose,
  Portal as DialogPortal,
  Content as DialogContent,
  Overlay as DialogOverlay,
  Title as DialogTitle,
  Description as DialogDescription,
  Header as DialogHeader,
  Footer as DialogFooter,
};
