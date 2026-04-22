import { Tooltip as TooltipPrimitive } from 'bits-ui';
import Content from './tooltip-content.svelte';

const Provider = TooltipPrimitive.Provider;
const Root = TooltipPrimitive.Root;
const Trigger = TooltipPrimitive.Trigger;

export {
  Provider,
  Root,
  Trigger,
  Content,
  Provider as TooltipProvider,
  Root as Tooltip,
  Trigger as TooltipTrigger,
  Content as TooltipContent,
};
