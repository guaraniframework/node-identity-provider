import { Expose } from 'class-transformer';
import { IsDefined, IsEmail, IsIn, IsOptional, IsPhoneNumber, Matches } from 'class-validator';

export class UpdateUserDto {
  @Expose({ name: 'given_name' })
  @Matches(/^[a-zA-Z ]+$/, { message: 'The given name must only have letters and spaces.' })
  @IsDefined({ message: 'The given name must not be empty.' })
  public readonly givenName!: string;

  @Expose({ name: 'middle_name' })
  @Matches(/^[a-zA-Z ]+$/, { message: 'The middle name must only have letters and spaces.' })
  @IsOptional()
  public readonly middleName?: string;

  @Expose({ name: 'family_name' })
  @Matches(/^[a-zA-Z ]+$/, { message: 'The family name must only have letters and spaces.' })
  @IsDefined({ message: 'The family name must not be empty.' })
  public readonly familyName!: string;

  @Expose({ name: 'email' })
  @IsEmail(undefined, { message: 'Invalid email.' })
  @IsDefined({ message: 'The email must not be empty.' })
  public readonly email!: string;

  @Expose({ name: 'phone_number' })
  @IsPhoneNumber(undefined, { message: 'Invalid phone number.' })
  @IsDefined({ message: 'The phone number must not be empty.' })
  public readonly phoneNumber!: string;

  @Expose({ name: 'birthdate' })
  @Matches(/^[0-9]{4}-(0[1-9]|1[0-2])-(0[1-9]|[1-2][0-9]|3[0-1])$/, { message: 'Invalid birthdate.' })
  @IsDefined({ message: 'The birthdate must not be empty.' })
  public readonly birthdate!: string;

  @Expose({ name: 'gender' })
  @IsIn(['male', 'female'], { message: 'Invalid gender.' })
  @IsOptional()
  public readonly gender?: string;
}
