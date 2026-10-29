import { Buffer } from 'buffer';

import { Constructor, getContainer } from '@guarani/di';

import { ClientAuthentication } from '../../../client-authentication/client-authentication';
import { ClientAuthenticationName } from '../../../client-authentication/client-authentication-name.type';
import { PrivateKeyJwtClientAuthentication } from '../../../client-authentication/private-key-jwt/private-key-jwt.client-authentication';
import { CONTAINER, INTERACTION_CLIENT_AUTHENTICATION } from '../../../constants';
import { Endpoint } from '../../../endpoints/endpoint';
import { InteractionEndpoint } from '../../../endpoints/interaction/interaction.endpoint';
import { ConsentInteractionType } from '../../../interaction-types/consent/consent.interaction-type';
import { CreateInteractionType } from '../../../interaction-types/create/create.interaction-type';
import { InteractionType } from '../../../interaction-types/interaction-type';
import { LoginInteractionType } from '../../../interaction-types/login/login.interaction-type';
import { SelectAccountInteractionType } from '../../../interaction-types/select-account/select-account.interaction-type';
import { ConsentContextInteractionValidator } from '../../../validators/interaction/context/consent/consent.context-interaction.validator';
import { ContextInteractionValidator } from '../../../validators/interaction/context/context-interaction.validator';
import { CreateContextInteractionValidator } from '../../../validators/interaction/context/create/create.context-interaction.validator';
import { LoginContextInteractionValidator } from '../../../validators/interaction/context/login/login.context-interaction.validator';
import { SelectAccountContextInteractionValidator } from '../../../validators/interaction/context/select-account/select-account.context-interaction.validator';
import { ConsentDecisionInteractionValidator } from '../../../validators/interaction/decision/consent/consent.decision-interaction.validator';
import { CreateDecisionInteractionValidator } from '../../../validators/interaction/decision/create/create.decision-interaction.validator';
import { DecisionInteractionValidator } from '../../../validators/interaction/decision/decision-interaction.validator';
import { LoginDecisionInteractionValidator } from '../../../validators/interaction/decision/login/login.decision-interaction.validator';
import { SelectAccountDecisionInteractionValidator } from '../../../validators/interaction/decision/select-account/select-account.decision-interaction.validator';
import { InteractionEndpointOptions } from './interaction-endpoint.options';

const invalidClientAuthenticationMethods: any[] = [
  undefined,
  null,
  true,
  1,
  1.2,
  1n,
  'a',
  Symbol('a'),
  Buffer,
  Buffer.alloc(1),
  () => 1,
  {},
  [undefined],
  [null],
  [true],
  [1],
  [1.2],
  [1n],
  [Symbol('a')],
  [Buffer],
  [Buffer.alloc(1)],
  [() => 1],
  [{}],
  [[]],
  [''],
  ['a'],
];

describe('Interaction Endpoint Options', () => {
  let options: InteractionEndpointOptions;
  const container = getContainer(CONTAINER);

  beforeEach(() => {
    options = new InteractionEndpointOptions(container);
  });

  afterEach(() => {
    container.clear();
  });

  describe('useClientAuthenticationMethods()', () => {
    it.each(invalidClientAuthenticationMethods)(
      'should throw when the provided Client Authentication Methods is invalid.',
      (methods) => {
        expect(() => options.useClientAuthenticationMethods(methods)).toThrowWithMessage(
          TypeError,
          'The provided Client Authentication Methods is invalid.',
        );
      },
    );

    it('should register the default Client Authentication Methods in the Identity Provider Factory.', () => {
      expect(() => options.useClientAuthenticationMethods([])).not.toThrow();

      expect(options['methods']).toStrictEqual<ClientAuthenticationName[]>(['client_secret_basic']);
    });

    it('should register the provided Client Authentication Methods in the Identity Provider Factory.', () => {
      expect(() => options.useClientAuthenticationMethods(['private_key_jwt'])).not.toThrow();

      expect(options['methods']).toStrictEqual<ClientAuthenticationName[]>(['private_key_jwt']);
    });
  });

  describe('build()', () => {
    it('should register the actors of the Interaction Endpoint in the Identity Provider Factory.', () => {
      options.useClientAuthenticationMethods(['private_key_jwt']);

      expect(() => options.build()).not.toThrow();

      expect(container.isRegistered(Endpoint)).toBeTrue();
      expect(container.isRegistered(InteractionType)).toBeTrue();
      expect(container.isRegistered<ClientAuthentication>(INTERACTION_CLIENT_AUTHENTICATION)).toBeTrue();
      expect(container.isRegistered(ContextInteractionValidator)).toBeTrue();
      expect(container.isRegistered(DecisionInteractionValidator)).toBeTrue();

      expect(container.get(Endpoint)).toBe(InteractionEndpoint);

      expect(
        container['registry'].getAll(InteractionType).map((binding: any) => binding['provider']['useClass']),
      ).toStrictEqual<Constructor<InteractionType>[]>(
        expect.arrayContaining([
          ConsentInteractionType,
          CreateInteractionType,
          LoginInteractionType,
          SelectAccountInteractionType,
        ]),
      );

      expect(
        container['registry']
          .getAll(INTERACTION_CLIENT_AUTHENTICATION)
          .map((binding: any) => binding['provider']['useClass']),
      ).toStrictEqual<Constructor<ClientAuthentication>[]>(expect.arrayContaining([PrivateKeyJwtClientAuthentication]));

      expect(
        container['registry']
          .getAll(ContextInteractionValidator)
          .map((binding: any) => binding['provider']['useClass']),
      ).toStrictEqual<Constructor<ContextInteractionValidator>[]>([
        ConsentContextInteractionValidator,
        CreateContextInteractionValidator,
        LoginContextInteractionValidator,
        SelectAccountContextInteractionValidator,
      ]);

      expect(
        container['registry']
          .getAll(DecisionInteractionValidator)
          .map((binding: any) => binding['provider']['useClass']),
      ).toStrictEqual<Constructor<DecisionInteractionValidator>[]>([
        ConsentDecisionInteractionValidator,
        CreateDecisionInteractionValidator,
        LoginDecisionInteractionValidator,
        SelectAccountDecisionInteractionValidator,
      ]);
    });
  });
});
