import { redirect } from "next/navigation";

// Temporal: hasta que el equipo incorpore autenticación y selección de roles.
export default function Inicio() {
  redirect("/consulta");
}
