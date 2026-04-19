import { DataSource } from 'typeorm';
import { I{{Entity}}Repository } from './I{{Entity}}Repository';
// TODO: import your {{Entity}} TypeORM entity once created
// import { {{Entity}} } from './{{Entity}}.entity';

/**
 * {{Entity}}Repository — Infrastructure Layer
 *
 * Concrete implementation of I{{Entity}}Repository using TypeORM.
 * Implements the interface defined in the Domain/Application layer so that
 * the Application layer never depends on this infrastructure-level class directly.
 */
export class {{Entity}}Repository implements I{{Entity}}Repository {
  constructor(private readonly dataSource: DataSource) {}

  async findAll(): Promise<unknown[]> {
    // const repo = this.dataSource.getRepository({{Entity}});
    // return repo.find();
    throw new Error('Not implemented — replace with entity-specific query.');
  }

  async findById(id: string): Promise<unknown | null> {
    // const repo = this.dataSource.getRepository({{Entity}});
    // return repo.findOneBy({ id });
    throw new Error('Not implemented — replace with entity-specific query.');
  }

  async create(data: Record<string, unknown>): Promise<unknown> {
    // const repo = this.dataSource.getRepository({{Entity}});
    // const entity = repo.create(data as DeepPartial<{{Entity}}>);
    // return repo.save(entity);
    throw new Error('Not implemented — replace with entity-specific insert.');
  }

  async update(id: string, data: Record<string, unknown>): Promise<unknown | null> {
    // const repo = this.dataSource.getRepository({{Entity}});
    // await repo.update(id, data as QueryDeepPartialEntity<{{Entity}}>);
    // return this.findById(id);
    throw new Error('Not implemented — replace with entity-specific update.');
  }

  async delete(id: string): Promise<void> {
    // const repo = this.dataSource.getRepository({{Entity}});
    // await repo.delete(id);
    throw new Error('Not implemented — replace with entity-specific delete.');
  }
}
