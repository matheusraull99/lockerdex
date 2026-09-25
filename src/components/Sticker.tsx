import { memo, useEffect, useRef, useState, type CSSProperties } from "react";
import { hideBroken, imgUrl, type Slot, type Status } from "../lib/data";

interface Props {
  slot: Slot;
  status: Status;
  color: string;
  label: string;
  size?: "md" | "sm";
  onCycle?: (slot: Slot) => void;
}

/** Figurinha: vazia com número e silhueta, colada quando tenho, holográfica quando dominei. */
export const Sticker = memo(function Sticker({ slot, status, color, label, size = "md", onCycle }: Props) {
  const [anim, setAnim] = useState(false);
  const first = useRef(true);
  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    if (status === 0) return;
    setAnim(true);
    const t = setTimeout(() => setAnim(false), 520);
    return () => clearTimeout(t);
  }, [status]);

  const cls = `st st-${size}${anim ? " st-anim" : ""}`;
  const style = { "--tilt": `${slot.tilt}deg`, "--vc": color } as CSSProperties;
  const inner = (
    <>
      <span className="st-art">
        <img src={imgUrl(slot.img)} alt="" loading="lazy" decoding="async" draggable={false} onError={hideBroken} />
      </span>
      <span className="st-no">{slot.no}</span>
      <span className="st-var" aria-hidden />
      {status === 2 && <span className="st-foil" aria-hidden />}
    </>
  );

  if (!onCycle)
    return (
      <span className={cls} data-status={status} data-rarity={slot.sprite.rarity} style={style} role="img" aria-label={label}>
        {inner}
      </span>
    );
  return (
    <button
      type="button"
      id={`st-${slot.id}`}
      className={cls}
      data-status={status}
      data-rarity={slot.sprite.rarity}
      style={style}
      aria-label={label}
      onClick={() => onCycle(slot)}
    >
      {inner}
    </button>
  );
});
