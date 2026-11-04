import { Expose } from 'class-transformer';
import { IsDefined, IsEmail, IsPhoneNumber, Matches } from 'class-validator';

export class UserRegistrationDto {
  @Expose({ name: 'email' })
  @IsEmail(undefined, { message: 'Invalid email.' })
  @IsDefined({ message: 'The email must not be empty.' })
  public readonly email!: string;

  @Expose({ name: 'password' })
  @Matches(/^(?=.*?[A-Z])(?=.*?[a-z])(?=.*?[0-9])(?=.*?[!@#$%&*\-_+=?^~]).{8,64}$/, {
    message:
      'The password must have between 8 and 64 characteres, upper and lower case letters, ' +
      'numbers and special characteres (!@#$%&*-_+=?^~)',
  })
  @IsDefined({ message: 'The password must not be empty.' })
  public readonly password!: string;

  @Expose({ name: 'given_name' })
  @Matches(/^(?=.*?[a-zA-Z])[a-zA-Z ]+$/, { message: 'The given name must only have letters and spaces.' })
  @IsDefined({ message: 'The given name must not be empty.' })
  public readonly given_name!: string;

  @Expose({ name: 'family_name' })
  @Matches(/^(?=.*?[a-zA-Z])[a-zA-Z ]+$/, { message: 'The family name must only have letters and spaces.' })
  @IsDefined({ message: 'The family name must not be empty.' })
  public readonly family_name!: string;

  @Expose({ name: 'phone_number' })
  @IsPhoneNumber(undefined, { message: 'Invalid phone number.' })
  @IsDefined({ message: 'The phone number must not be empty.' })
  public readonly phone_number!: string;

  @Expose({ name: 'birthdate' })
  @Matches(/^[0-9]{4}-(0[1-9]|1[0-2])-(0[1-9]|[1-2][0-9]|3[0-1])$/, { message: 'Invalid birthdate.' })
  @IsDefined({ message: 'The birthdate must not be empty.' })
  public readonly birthdate!: string;

  @Expose({ name: 'address' })
  @IsDefined({ message: 'The address must not be empty.' })
  public readonly address!: string;
}
