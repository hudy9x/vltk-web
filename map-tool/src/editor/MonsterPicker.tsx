import { useEffect, useId, useState } from "react";
import { Check, ChevronsUpDown, ImageOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandInput,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Choice } from "./Fields";
import {
  filterMonsters,
  levelOptions,
  monsterRanges,
} from "@/lib/presentation";
import type { AssetStore } from "@/lib/native";
import type { EncounterDefinition, Monster } from "@/lib/types";
export function MonsterImage({
  monster,
  assets,
}: {
  monster?: Monster;
  assets: AssetStore;
}) {
  const [, refresh] = useState(0);
  useEffect(
    () => assets.subscribe(() => refresh((value) => value + 1)),
    [assets],
  );
  const image = monster?.image ? assets.imageFor(monster.image) : null;
  const missing = !image || assets.errors.has(monster!.image!);
  return (
    <span
      className="monster-thumbnail"
      title={missing ? "Chưa có ảnh local" : monster?.name}
    >
      {!missing && image.src ? (
        <img src={image.src} alt={monster?.name || "Quái"} />
      ) : (
        <ImageOff size={15} />
      )}
    </span>
  );
}
interface Props {
  label: string;
  value?: number;
  onChange(value: number): void;
  monsters: Monster[];
  encounters: EncounterDefinition[];
  assets: AssetStore;
  exclude?: number[];
}
export function MonsterPicker({
  label,
  value,
  onChange,
  monsters,
  encounters,
  assets,
  exclude = [],
}: Props) {
  const [open, setOpen] = useState(false),
    [query, setQuery] = useState(""),
    [level, setLevel] = useState("all");
  const id = useId(),
    selected = monsters.find((monster) => monster.id === value);
  const choices = filterMonsters(monsters, encounters, query, level, exclude);
  return (
    <div className="field">
      <Label htmlFor={id}>{label}</Label>
      <Popover
        open={open}
        onOpenChange={(next) => {
          setOpen(next);
          if (next) setQuery("");
        }}
      >
        <PopoverTrigger asChild>
          <Button
            id={id}
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="monster-picker-trigger"
          >
            {selected ? (
              <>
                <MonsterImage monster={selected} assets={assets} />
                <span>
                  {selected.name}
                  <small>#{selected.id}</small>
                </span>
              </>
            ) : (
              <span>Chọn quái…</span>
            )}
            <ChevronsUpDown size={14} />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="monster-picker-popover" align="end">
          <div className="monster-filter">
            <Choice
              label="Lọc theo cấp luyện công"
              value={level}
              options={levelOptions(encounters)}
              onChange={setLevel}
            />
            <p>
              Khoảng cấp của bãi có loại quái này, không phải cấp cố định của
              quái.
            </p>
          </div>
          <Command shouldFilter={false}>
            <CommandInput
              placeholder="Tìm tên hoặc ID quái…"
              value={query}
              onValueChange={setQuery}
            />
            <CommandList>
              <CommandEmpty>Không tìm thấy quái phù hợp.</CommandEmpty>
              <CommandGroup>
                {choices.map((monster) => {
                  const ranges = monsterRanges(monster.id, encounters);
                  return (
                    <CommandItem
                      key={monster.id}
                      value={String(monster.id)}
                      onSelect={() => {
                        onChange(monster.id);
                        setOpen(false);
                      }}
                      className="monster-option"
                    >
                      <MonsterImage monster={monster} assets={assets} />
                      <span>
                        <strong>{monster.name}</strong>
                        <small>
                          #{monster.id} ·{" "}
                          {ranges.length
                            ? ranges
                                .map((range) => `Cấp ${range[0]}–${range[1]}`)
                                .join(", ")
                            : "Chưa gán bãi"}
                        </small>
                      </span>
                      {monster.id === value && <Check size={14} />}
                    </CommandItem>
                  );
                })}
              </CommandGroup>
            </CommandList>
          </Command>
          <div className="monster-picker-count">{choices.length} loại quái</div>
        </PopoverContent>
      </Popover>
    </div>
  );
}
