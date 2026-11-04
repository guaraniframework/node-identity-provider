import { Request, Response } from 'express';

import { getContainer } from '@guarani/di';

import { CONTAINER } from '../../../../../src/lib/constants';
import { DataAccess } from '../../../../../src/lib/data-access/data-access';
import { CustomDataAccess } from '../custom.data-access';

class Controller {
  #container = getContainer(CONTAINER);

  #dataAccess!: CustomDataAccess;

  private get dataAccess(): CustomDataAccess {
    if (!(this.#dataAccess instanceof CustomDataAccess)) {
      this.#dataAccess = this.#container.resolve(DataAccess) as CustomDataAccess;
    }

    return this.#dataAccess;
  }

  public async home(request: Request, response: Response): Promise<void> {
    const client = (await this.dataAccess.findClients())[0]!;

    return response
      .cookie('client_id', client.id, { httpOnly: true, secure: true, signed: true })
      .render('home', { request, title: 'Home' });
  }
}

export const HomeController = new Controller();
