import { BedDouble, MapPin, Phone, Star } from "lucide-react";
import type { ReactNode } from "react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import type { Hospital } from "@/types";

interface HospitalCardProps {
  hospital: Hospital;
  action?: ReactNode;
}

export function HospitalCard({ hospital, action }: HospitalCardProps) {
  const occupancy = Math.round(
    (hospital.capacity.occupiedBeds / Math.max(hospital.capacity.totalBeds, 1)) * 100,
  );

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle className="text-base">{hospital.name}</CardTitle>
        <p className="text-muted-foreground flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
          <span className="flex items-center gap-1">
            <MapPin className="size-3" aria-hidden="true" />
            {hospital.city}
          </span>
          <span className="flex items-center gap-1">
            <Phone className="size-3" aria-hidden="true" />
            {hospital.phone}
          </span>
          {hospital.rating > 0 && (
            <span className="flex items-center gap-1">
              <Star className="size-3 fill-amber-400 text-amber-400" aria-hidden="true" />
              {hospital.rating.toFixed(1)}
            </span>
          )}
        </p>
      </CardHeader>
      <CardContent className="flex flex-1 flex-col gap-3">
        <p className="text-muted-foreground line-clamp-3 text-sm">
          {hospital.description}
        </p>
        <div className="flex flex-wrap gap-1.5">
          {hospital.specialties.map((specialty) => (
            <Badge key={specialty} variant="secondary" className="font-normal">
              {specialty}
            </Badge>
          ))}
        </div>
      </CardContent>
      <CardFooter className="justify-between gap-3">
        <span className="text-muted-foreground flex items-center gap-1 text-xs">
          <BedDouble className="size-3.5" aria-hidden="true" />
          {hospital.capacity.occupiedBeds}/{hospital.capacity.totalBeds} beds ({occupancy}%)
        </span>
        {action}
      </CardFooter>
    </Card>
  );
}
