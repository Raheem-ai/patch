import { MigrationInterface } from 'mongo-migrate-ts';
import { AnyBulkWriteOperation, Db } from 'mongodb';
import { hash } from 'bcrypt';
import { UserDoc } from '../models/user';

export class HashPasswords implements MigrationInterface {
	
	async up(db: Db): Promise<any> {
		const userCollection = db.collection<UserDoc>('users');

		const users = await userCollection.find().toArray();

		const hashedUsers: UserDoc[] = [];

		for (const user of users) {
			user.password = await hash(user.password, 10);
			hashedUsers.push(user);
		}

		const bulkOps: AnyBulkWriteOperation[] = hashedUsers.map(doc => ({
			updateOne: {
				filter: { _id: doc._id },
				update: {
					$set: {
						password: doc.password
					}
				}
			}
		}))

		await userCollection.bulkWrite(bulkOps as any)
	}

	async down(db: Db): Promise<any> {
		// there is no way to undo this by design
	}
}