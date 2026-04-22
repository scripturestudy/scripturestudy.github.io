import { DropdownMenu as DropdownMenuPrimitive } from 'bits-ui';
import Content from './dropdown-menu-content.svelte';
import Item from './dropdown-menu-item.svelte';
import Separator from './dropdown-menu-separator.svelte';
import Label from './dropdown-menu-label.svelte';

const Root = DropdownMenuPrimitive.Root;
const Trigger = DropdownMenuPrimitive.Trigger;
const Group = DropdownMenuPrimitive.Group;

export {
  Root,
  Trigger,
  Group,
  Content,
  Item,
  Separator,
  Label,
  Root as DropdownMenu,
  Trigger as DropdownMenuTrigger,
  Group as DropdownMenuGroup,
  Content as DropdownMenuContent,
  Item as DropdownMenuItem,
  Separator as DropdownMenuSeparator,
  Label as DropdownMenuLabel,
};
