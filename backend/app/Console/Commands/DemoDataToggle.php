<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Database\Seeders\DemoDataSeeder;
use Illuminate\Support\Facades\Artisan;

class DemoDataToggle extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'demo:data {action : "seed" to add mock data, "clear" to remove it}';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Toggle mock data for UI testing without affecting real ESP32 data.';

    /**
     * Execute the console command.
     */
    public function handle()
    {
        $action = $this->argument('action');

        if ($action === 'seed') {
            $this->info('Seeding mock data for UI testing...');
            $seeder = new DemoDataSeeder();
            $seeder->run();
            $this->info('Mock data seeded successfully! Your dashboard will now show dummy data alongside real data.');
            return Command::SUCCESS;
        }

        if ($action === 'clear') {
            $this->info('Clearing mock data...');
            $deletedCount = DemoDataSeeder::clear();
            $this->info("Mock data cleared! Removed $deletedCount fake sensor readings.");
            return Command::SUCCESS;
        }

        $this->error('Invalid action. Use "seed" or "clear".');
        return Command::FAILURE;
    }
}
