import { Star, Stethoscope } from "lucide-react";
import type { ReactNode } from "react";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import type { Doctor } from "@/types";
import { formatCurrency, getInitials } from "@/utils/format";

interface DoctorCardProps {
  doctor: Doctor;
  hospitalName?: string;
  action?: ReactNode;
}

export function DoctorCard({ doctor, hospitalName, action }: DoctorCardProps) {
  return (
    <Card className="h-full">
      <CardContent className="flex flex-1 flex-col gap-3">
        <div className="flex items-start gap-3">
          <Avatar className="size-11">
            <AvatarFallback>{getInitials(doctor.fullName)}</AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold">{doctor.fullName}</p>
            <p className="text-muted-foreground flex items-center gap-1 text-xs">
              <Stethoscope className="size-3" aria-hidden="true" />
              {doctor.specialty}
            </p>
            {hospitalName && (
              <p className="text-muted-foreground mt-0.5 truncate text-xs">
                {hospitalName}
              </p>
            )}
          </div>
        </div>

        <div className="text-muted-foreground flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
          <span className="flex items-center gap-1">
            <Star className="size-3 fill-amber-400 text-amber-400" aria-hidden="true" />
            {doctor.rating.toFixed(1)}
          </span>
          <span>{doctor.yearsExperience} yrs experience</span>
          <span>{formatCurrency(doctor.consultationFee)}</span>
        </div>

        <Badge
          variant={doctor.isAcceptingPatients ? "secondary" : "outline"}
          className="w-fit"
        >
          {doctor.isAcceptingPatients ? "Accepting patients" : "Not accepting patients"}
        </Badge>
      </CardContent>
      {action && <CardFooter>{action}</CardFooter>}
    </Card>
  );
}
