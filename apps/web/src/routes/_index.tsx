import type { Route } from "./+types/_index";
import UserMenu from "@/components/composites/user-menu";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "CareerGPS" },
    { name: "description", content: "CareerGPS is a web application" },
  ];
}

export default function Home() {

  return (
    <div className="container mx-auto max-w-3xl px-4 py-2">
      <div className="flex justify-between items-center flex-wrap">
        <h1 className="text-2xl">CareerGPS</h1>
        <UserMenu/>
      </div>
      
    </div>
  );
}
