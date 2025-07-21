// Test script to verify webpack alias behavior
process.env.NEXT_PUBLIC_FLAVOR = 'zink';

const path = require('path');
const zinkCluster = require('./app/flavors/zink/cluster.ts');

console.log('Testing zink flavor clusters:');
console.log('CLUSTERS:', zinkCluster.CLUSTERS);
console.log('Default cluster:', zinkCluster.DEFAULT_CLUSTER);
console.log('Cluster enum values:', Object.values(zinkCluster.Cluster));

// Verify it only contains zink
if (zinkCluster.CLUSTERS.length === 1 && zinkCluster.CLUSTERS[0] === zinkCluster.Cluster.Zink) {
  console.log('✅ PASS: Zink flavor correctly shows only Zink cluster');
} else {
  console.log('❌ FAIL: Zink flavor shows wrong clusters:', zinkCluster.CLUSTERS);
} 