# ui

Shared design-system primitives built on `@base-ui/react`, `class-variance-authority`, and Tailwind CSS, plus a reusable error boundary view.

## Interface

- `[alert-dialog.tsx:AlertDialog]`, `[alert-dialog.tsx:AlertDialogTrigger]`, `[alert-dialog.tsx:AlertDialogPortal]`, `[alert-dialog.tsx:AlertDialogOverlay]`, `[alert-dialog.tsx:AlertDialogContent]`, `[alert-dialog.tsx:AlertDialogHeader]`, `[alert-dialog.tsx:AlertDialogFooter]`, `[alert-dialog.tsx:AlertDialogTitle]`, `[alert-dialog.tsx:AlertDialogDescription]`, `[alert-dialog.tsx:AlertDialogAction]`, `[alert-dialog.tsx:AlertDialogCancel]` — Confirmation modal primitives wrapping `@base-ui/react/dialog`.
- `[avatar.tsx:Avatar]`, `[avatar.tsx:AvatarImage]`, `[avatar.tsx:AvatarFallback]`, `[avatar.tsx:AvatarGroup]`, `[avatar.tsx:AvatarGroupCount]`, `[avatar.tsx:AvatarBadge]` — User avatar primitives wrapping `@base-ui/react/avatar` (`size`: `"default" | "sm" | "lg"`).
- `[badge.tsx:Badge]`, `[badge.tsx:badgeVariants]` — Polymorphic badge (`useRender`) with `default`, `secondary`, `destructive`, `outline`, `ghost`, and `link` variants.
- `[button.tsx:Button]`, `[button.tsx:buttonVariants]` — Button wrapping `@base-ui/react/button` with 6 visual variants and 8 sizes (`default`, `xs`, `sm`, `lg`, `icon`, `icon-xs`, `icon-sm`, `icon-lg`).
- `[card.tsx:Card]`, `[card.tsx:CardHeader]`, `[card.tsx:CardFooter]`, `[card.tsx:CardTitle]`, `[card.tsx:CardAction]`, `[card.tsx:CardDescription]`, `[card.tsx:CardContent]` — Card layout primitives (`size`: `"default" | "sm"`).
- `[dialog.tsx:Dialog]`, `[dialog.tsx:DialogClose]`, `[dialog.tsx:DialogContent]`, `[dialog.tsx:DialogDescription]`, `[dialog.tsx:DialogFooter]`, `[dialog.tsx:DialogHeader]`, `[dialog.tsx:DialogOverlay]`, `[dialog.tsx:DialogPortal]`, `[dialog.tsx:DialogTitle]`, `[dialog.tsx:DialogTrigger]` — Modal dialog primitives wrapping `@base-ui/react/dialog`.
- `[dropdown-menu.tsx:DropdownMenu]`, `[dropdown-menu.tsx:DropdownMenuPortal]`, `[dropdown-menu.tsx:DropdownMenuTrigger]`, `[dropdown-menu.tsx:DropdownMenuContent]`, `[dropdown-menu.tsx:DropdownMenuGroup]`, `[dropdown-menu.tsx:DropdownMenuLabel]`, `[dropdown-menu.tsx:DropdownMenuItem]`, `[dropdown-menu.tsx:DropdownMenuCheckboxItem]`, `[dropdown-menu.tsx:DropdownMenuRadioGroup]`, `[dropdown-menu.tsx:DropdownMenuRadioItem]`, `[dropdown-menu.tsx:DropdownMenuSeparator]`, `[dropdown-menu.tsx:DropdownMenuShortcut]`, `[dropdown-menu.tsx:DropdownMenuSub]`, `[dropdown-menu.tsx:DropdownMenuSubTrigger]`, `[dropdown-menu.tsx:DropdownMenuSubContent]` — Menu primitives wrapping `@base-ui/react/menu`.
- `[error-view.tsx:ErrorView]` — Client error fallback component (`{ error: Error & { digest?: string }; reset: () => void; heading?: string }`).
- `[input.tsx:Input]` — Text input wrapping `@base-ui/react/input`.
- `[label.tsx:Label]` — Styled `<label>` primitive.
- `[progress.tsx:Progress]`, `[progress.tsx:ProgressTrack]`, `[progress.tsx:ProgressIndicator]`, `[progress.tsx:ProgressLabel]`, `[progress.tsx:ProgressValue]` — Progress bar primitives wrapping `@base-ui/react/progress`.
- `[scroll-area.tsx:ScrollArea]`, `[scroll-area.tsx:ScrollBar]` — Custom scrollbar container wrapping `@base-ui/react/scroll-area`.
- `[select.tsx:Select]`, `[select.tsx:SelectContent]`, `[select.tsx:SelectGroup]`, `[select.tsx:SelectItem]`, `[select.tsx:SelectLabel]`, `[select.tsx:SelectScrollDownButton]`, `[select.tsx:SelectScrollUpButton]`, `[select.tsx:SelectSeparator]`, `[select.tsx:SelectTrigger]`, `[select.tsx:SelectValue]` — Dropdown select primitives wrapping `@base-ui/react/select`.
- `[separator.tsx:Separator]` — Divider wrapping `@base-ui/react/separator` (`orientation`: `"horizontal" | "vertical"`).
- `[sheet.tsx:Sheet]`, `[sheet.tsx:SheetTrigger]`, `[sheet.tsx:SheetClose]`, `[sheet.tsx:SheetContent]`, `[sheet.tsx:SheetHeader]`, `[sheet.tsx:SheetFooter]`, `[sheet.tsx:SheetTitle]`, `[sheet.tsx:SheetDescription]` — Slide-over drawer primitives wrapping `@base-ui/react/dialog` (`side`: `"top" | "right" | "bottom" | "left"`).
- `[skeleton.tsx:Skeleton]` — Animated pulse placeholder `<div>`.
- `[tabs.tsx:Tabs]`, `[tabs.tsx:TabsList]`, `[tabs.tsx:TabsTrigger]`, `[tabs.tsx:TabsContent]`, `[tabs.tsx:tabsListVariants]` — Tabbed interface primitives wrapping `@base-ui/react/tabs` (`variant`: `"default" | "line"`).
- `[textarea.tsx:Textarea]` — Forward-ref styled `<textarea>` primitive.

## Invariants

- `[alert-dialog.tsx:AlertDialogAction]`, `[alert-dialog.tsx:AlertDialogCancel]` — Both render inside `DialogPrimitive.Close`, automatically closing the dialog on click.
- `[dialog.tsx:DialogContent]`, `[sheet.tsx:SheetContent]` — Default `showCloseButton = true` renders an accessible close button with `sr-only` `"Close"` text.
- `[progress.tsx:Progress]` — Always renders `ProgressTrack` and `ProgressIndicator` internally alongside any `children`.

## Side Effects

- `[error-view.tsx:ErrorView]` — Logs `error` via `console.error(error)` inside `useEffect` whenever `error` changes.

## Verification

```bash
npm run lint && npm run build
```
