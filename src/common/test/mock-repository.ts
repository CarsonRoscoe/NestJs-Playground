import { getRepositoryToken } from '@nestjs/typeorm';
import { EntityClassOrSchema } from '@nestjs/typeorm/dist/interfaces/entity-class-or-schema.type';
import { Repository } from 'typeorm';

export type MockRepository<T = any> = Partial<
  Record<keyof Repository<T>, jest.Mock>
>;

const createMockRepository = <T = any>(): MockRepository<T> => ({
  findOne: jest.fn(),
  create: jest.fn(),
});

export const createMockRepositoryProvider = <T = any>(
  entity: EntityClassOrSchema,
): {
  provide: string | Function;
  useValue: MockRepository<T>;
} => ({
  provide: getRepositoryToken(entity),
  useValue: createMockRepository<T>(),
});
