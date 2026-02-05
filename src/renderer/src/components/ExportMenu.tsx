import * as DropdownMenu from '@radix-ui/react-dropdown-menu'
import { Download, FileText, Music, FileCode, FileType } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { AlphaTabActions } from '@/hooks/useAlphaTab'

interface ExportMenuProps {
  actions: AlphaTabActions
  disabled: boolean
}

export function ExportMenu({ actions, disabled }: ExportMenuProps) {
  return (
    <DropdownMenu.Root>
      <Tooltip>
        <TooltipTrigger asChild>
          <DropdownMenu.Trigger asChild>
            <Button variant="ghost" size="icon" disabled={disabled} className="no-drag">
              <Download className="h-4 w-4" />
            </Button>
          </DropdownMenu.Trigger>
        </TooltipTrigger>
        <TooltipContent>Export</TooltipContent>
      </Tooltip>

      <DropdownMenu.Portal>
        <DropdownMenu.Content
          className="z-50 min-w-[180px] rounded-lg border border-[var(--border-default)] bg-[var(--bg-surface)] p-1 shadow-lg"
          sideOffset={5}
          align="end"
        >
          <DropdownMenu.Item
            className="flex cursor-pointer items-center gap-2 rounded-md px-3 py-2 text-sm text-[var(--text-secondary)] outline-none hover:bg-[var(--bg-surface-raised)] hover:text-[var(--text-primary)]"
            onSelect={() => actions.exportPdf()}
          >
            <FileText className="h-4 w-4" />
            PDF (Print)
          </DropdownMenu.Item>

          <DropdownMenu.Item
            className="flex cursor-pointer items-center gap-2 rounded-md px-3 py-2 text-sm text-[var(--text-secondary)] outline-none hover:bg-[var(--bg-surface-raised)] hover:text-[var(--text-primary)]"
            onSelect={() => actions.exportMidi()}
          >
            <Music className="h-4 w-4" />
            MIDI
          </DropdownMenu.Item>

          <DropdownMenu.Separator className="my-1 h-px bg-[var(--border-default)]" />

          <DropdownMenu.Item
            className="flex cursor-pointer items-center gap-2 rounded-md px-3 py-2 text-sm text-[var(--text-secondary)] outline-none hover:bg-[var(--bg-surface-raised)] hover:text-[var(--text-primary)]"
            onSelect={() => actions.exportAlphaTex()}
          >
            <FileCode className="h-4 w-4" />
            AlphaTex
          </DropdownMenu.Item>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  )
}
