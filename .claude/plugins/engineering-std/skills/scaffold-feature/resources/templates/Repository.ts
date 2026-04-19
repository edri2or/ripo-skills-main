import { DataSource, Repository } from 'typeorm';
// TODO: import your {{Entity}} TypeORM entity once created
// import { {{Entity}} } from './{{Entity}}.entity';

export class {{Entity}}Repository {
  // private readonly repo: Repository<{{Entity}}>;

  constructor(private readonly dataSource: DataSource) {
    // this.repo = dataSource.getRepository({{Entity}});
  }

  async findAll(): Promise<unknown[]> {
    // return this.repo.find();
    throw new Error('Not implemented — replace with entity-specific query.');
  }

  async findById(id: string): Promise<unknown | null> {
    // return this.repo.findOneBy({ id });
    throw new Error('Not implemented — replace with entity-specific query.');
  }

  async create(data: Record<string, unknown>): Promise<unknown> {
    // const entity = this.repo.create(data as DeepPartial<{{Entity}}>);
    // return this.repo.save(entity);
    throw new Error('Not implemented — replace with entity-specific insert.');
  }

  async update(id: string, data: Record<string, unknown>): Promise<unknown | null> {
    // await this.repo.update(id, data as QueryDeepPartialEntity<{{Entity}}>);
    // return this.findById(id);
    throw new Error('Not implemented — replace with entity-specific update.');
  }

  async delete(id: string): Promise<void> {
    // await this.repo.delete(id);
    throw new Error('Not implemented — replace with entity-specific delete.');
  }
}
