import { Type } from "class-transformer";
import { IsDateString, IsInt, Max, Min } from "class-validator";

export class CreateAvailabilityWindowDto {
  @IsDateString()
  startAt!: string;

  @IsDateString()
  endAt!: string;

  @Type(() => Number)
  @IsInt()
  @Min(5)
  @Max(240)
  slotDurationMin!: number;
}
