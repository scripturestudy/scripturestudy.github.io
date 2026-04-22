import { Dialog as SheetPrimitive } from 'bits-ui';

import Content from './sheet-content.svelte';
import Overlay from './sheet-overlay.svelte';
import Title from './sheet-title.svelte';
import Description from './sheet-description.svelte';
import Header from './sheet-header.svelte';

const Root = SheetPrimitive.Root;
const Trigger = SheetPrimitive.Trigger;
const Close = SheetPrimitive.Close;
const Portal = SheetPrimitive.Portal;

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
  Root as Sheet,
  Trigger as SheetTrigger,
  Close as SheetClose,
  Portal as SheetPortal,
  Content as SheetContent,
  Overlay as SheetOverlay,
  Title as SheetTitle,
  Description as SheetDescription,
  Header as SheetHeader,
};
