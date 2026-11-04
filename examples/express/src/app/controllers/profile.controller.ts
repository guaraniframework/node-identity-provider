import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { Request, Response } from 'express';

import { getContainer } from '@guarani/di';

import { CONTAINER } from '../../../../../src/lib/constants';
import { DataAccess } from '../../../../../src/lib/data-access/data-access';
import { User } from '../../../../../src/lib/entities/user';
import { CustomDataAccess } from '../custom.data-access';
import { UpdateUserDto } from '../dto/update-user.dto';

class Controller {
  #container = getContainer(CONTAINER);

  #dataAccess!: CustomDataAccess;

  private get dataAccess(): CustomDataAccess {
    if (!(this.#dataAccess instanceof CustomDataAccess)) {
      this.#dataAccess = this.#container.resolve(DataAccess) as CustomDataAccess;
    }

    return this.#dataAccess;
  }

  public async index(request: Request, response: Response): Promise<void> {
    return response.render('profile/index', { request, title: 'Profile', success: request.flash('success') });
  }

  public async edit(request: Request, response: Response): Promise<void> {
    return response.render('profile/edit', {
      request,
      title: 'Profile',
      errors: request.flash('errors'),
      success: request.flash('success'),
    });
  }

  public async editProfile(request: Request, response: Response): Promise<void> {
    const user = request.user as User;

    try {
      const updateUserDto = plainToInstance(UpdateUserDto, request.body);
      const errors = await validate(updateUserDto, { skipMissingProperties: true });

      if (errors.length > 0) {
        request.flash('errors', errors.map((error) => Object.values(error.constraints ?? {})).flat());
        return response.redirect(303, '/profile/edit');
      }

      Object.assign(user, updateUserDto);

      await this.dataAccess.saveUser(user);

      request.flash('success', 'Profile edited successfully');
      return response.redirect(303, '/profile/edit');
    } catch (err: unknown) {
      request.flash('errors', 'There was an error saving the profile');
      return response.redirect(303, '/profile/edit');
    }
  }
}

export const ProfileController = new Controller();
