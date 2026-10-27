"use client";

import Image from "next/image";
import { Icon } from "./Icon";
import admin from "@/features/admin/admin.module.css";
import consulta from "@/features/consulta/consulta.module.css";

type Kind = "temperatura" | "humedad" | "vpd" | "buzzer" | "dispositivo";
export default function SensorMetricCard({role, kind, title, value, detail, connected}: {
  role: "admin" | "consulta";
  kind: Kind;
  title: string;
  value: string;
  detail: string;
  connected?: boolean;
}) {
  const css = role === "admin" ? admin : consulta;
  const color = kind === "temperatura" ? css.tempCard : kind === "humedad" ? css.humCard : kind === "vpd" ? css.vpdCard : kind === "buzzer" ? (role === "admin" ? admin.soundCard : consulta.buzzerCard) : admin.deviceCard;
  const iconColor = kind === "temperatura" ? css.tempIcon : kind === "humedad" ? css.humIcon : kind === "vpd" ? css.vpdIcon : kind === "buzzer" ? (role === "admin" ? admin.soundIcon : consulta.buzzerIcon) : admin.deviceMetricIcon;
  const src = kind === "dispositivo" || kind === "vpd" ? "" : `/iconos/${kind === "buzzer" ? "buzzer" : kind}@2x.png`;
  const valueClass = kind === "buzzer" ? (role === "admin" ? admin.soundValue : consulta.buzzerText) : kind === "dispositivo" ? `${admin.soundValue} ${connected ? admin.connectedText : ""}` : "";
  const detailClass = role === "admin" && (kind === "buzzer" || kind === "dispositivo") ? admin.cardFootGray : css.cardFoot;
  return <article className={`${css.metricCard} ${color}`}>
    <span className={`${css.metricIcon} ${iconColor}`}>
      {src ? <Image src={src} width={64} height={64} alt="" className={css.metricAsset} unoptimized/> : <Icon name={kind === "vpd" ? "leaf" : "wifi"} size={40}/>}
    </span>
    <div><p>{title}</p><strong className={valueClass}>{value}</strong><span className={detailClass}>{detail}</span></div>
  </article>;
}
